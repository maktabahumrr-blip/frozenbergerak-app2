// ============================================================================
// FrozenBergerak - SATU FAIL GOOGLE APPS SCRIPT BERSEPADU (doGet & doPost)
// Menguruskan 2 fail Google Sheets berasingan secara serentak:
//   1. Fail "Frozen Bergerak" : Tab Produk, Alltimepromo, Seasonal
//   2. Fail "Jadual Team"     : Tab JADUAL & Tab AKSES TEAM (ID, NAMA, EMAIL, TARIKH, STATUS)
// ============================================================================

var FROZEN_BERGERAK_SHEET_ID = "1c4gL_FAsy5nuw_LQWq4djNA58kGpY1kQoVhDoT3w2Fw";
var JADUAL_TEAM_SHEET_ID = ""; // Pilihan: isi ID fail "Jadual Team" jika skrip dipasang di luar fail tersebut
var ADMIN_NOTIFICATION_EMAIL = "maktabahumrr@gmail.com";

/**
 * Jalankan fungsi ini sekali sahaja di editor Apps Script (Run > authorizePermissions)
 * untuk meluluskan kebenaran akses Google Sheets, Google Drive, dan Gmail (MailApp).
 */
function authorizePermissions() {
  var fb = openSheetFile_(FROZEN_BERGERAK_SHEET_ID, "Frozen Bergerak", false, ["Produk", "PRODUK"]);
  var jt = openSheetFile_(JADUAL_TEAM_SHEET_ID, "Jadual Team", true, ["JADUAL", "Jadual", "AKSES TEAM"]);
  if (jt) {
    getOrCreateAksesTeamSheet_(jt);
  }
  var quota = 0;
  try {
    quota = MailApp.getRemainingDailyQuota();
  } catch (e) {}
  Logger.log("Frozen Bergerak: " + (fb ? fb.getName() + " (" + fb.getId() + ")" : "TIDAK DIJUMPAI"));
  Logger.log("Jadual Team: " + (jt ? jt.getName() + " (" + jt.getId() + ")" : "TIDAK DIJUMPAI"));
  Logger.log("Kuota Emel Harian (MailApp): " + quota);
}

function openSheetFile_(sheetId, fileName, allowActiveFallback, expectedTabs) {
  // 1. Jika ID fail diberikan secara langsung, buka terus (paling pantas)
  if (sheetId && String(sheetId).trim() !== "") {
    try {
      return SpreadsheetApp.openById(String(sheetId).trim());
    } catch (e) {}
  }

  // 2. Semak spreadsheet aktif jika skrip dipasang terus di dalam fail sasaran
  if (allowActiveFallback) {
    try {
      var active = SpreadsheetApp.getActiveSpreadsheet();
      if (active && (!expectedTabs || findTabByNames_(active, expectedTabs))) {
        return active;
      }
    } catch (e) {}
  }

  // 3. Cari mengikut nama fail tepat dalam Google Drive (abaikan fail dalam Trash)
  try {
    var exactFiles = DriveApp.getFilesByName(fileName);
    while (exactFiles.hasNext()) {
      var f = exactFiles.next();
      if (f.isTrashed()) continue;
      try {
        var ss = SpreadsheetApp.openById(f.getId());
        if (!expectedTabs || findTabByNames_(ss, expectedTabs)) {
          return ss;
        }
      } catch (e) {}
    }
  } catch (e) {}

  // 4. Cari mengikut padanan separa (case-insensitive) jika ejaan nama fail sedikit berbeza
  try {
    var keyword = String(fileName || "").split(" ")[0].replace(/'/g, "");
    if (keyword) {
      var query = "title contains '" + keyword + "' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
      var fuzzyFiles = DriveApp.searchFiles(query);
      while (fuzzyFiles.hasNext()) {
        var ff = fuzzyFiles.next();
        try {
          var fss = SpreadsheetApp.openById(ff.getId());
          if (!expectedTabs || findTabByNames_(fss, expectedTabs)) {
            return fss;
          }
        } catch (e) {}
      }
    }
  } catch (e) {}

  if (allowActiveFallback) {
    try {
      return SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {}
  }
  return null;
}

function findTabByNames_(ss, candidateNames) {
  if (!ss) return null;
  var sheets = ss.getSheets();
  for (var i = 0; i < candidateNames.length; i++) {
    var exact = ss.getSheetByName(candidateNames[i]);
    if (exact) return exact;
  }
  for (var i = 0; i < candidateNames.length; i++) {
    var target = String(candidateNames[i]).toLowerCase().trim();
    for (var s = 0; s < sheets.length; s++) {
      if (sheets[s].getName().toLowerCase().trim() === target) {
        return sheets[s];
      }
    }
  }
  return null;
}

function findHeaderRowIdx_(values) {
  var limit = Math.min(values.length, 5);
  for (var r = 0; r < limit; r++) {
    var row = values[r];
    for (var c = 0; c < row.length; c++) {
      var cell = String(row[c] || "").trim().toUpperCase();
      if (/^(ID|ID PRODUK|KOD|PRODUK|NAMA PRODUK|ID PROMO|TAJUK PROMO|NAMA PROMO|ID JADUAL|NAMA TEAM|TEAM|KAWASAN|LOKASI|TARIKH|MASA|NAMA|EMAIL|E-MEL|STATUS)$/.test(cell)) {
        return r;
      }
    }
  }
  return 0;
}

function findColIdx_(headerRow, possibleNames, excludeWords) {
  excludeWords = excludeWords || [];
  for (var i = 0; i < possibleNames.length; i++) {
    var name = possibleNames[i].toUpperCase();
    for (var c = 0; c < headerRow.length; c++) {
      if (headerRow[c] === name) return c;
    }
  }
  for (var i = 0; i < possibleNames.length; i++) {
    var name = possibleNames[i].toUpperCase();
    for (var c = 0; c < headerRow.length; c++) {
      var h = headerRow[c];
      if (h.indexOf(name) !== -1) {
        var excluded = false;
        for (var ex = 0; ex < excludeWords.length; ex++) {
          if (h.indexOf(excludeWords[ex].toUpperCase()) !== -1) {
            excluded = true;
            break;
          }
        }
        if (!excluded) return c;
      }
    }
  }
  return -1;
}

function parsePriceNum_(val) {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  var cleaned = String(val || "").replace(/[^0-9.]/g, "");
  var num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function normalizeDriveImg_(url) {
  var raw = String(url || "").trim();
  if (!raw || raw.indexOf("http") !== 0) return "";
  var m = raw.match(/\/d\/([a-zA-Z0-9_-]+)/) || raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) {
    return "https://lh3.googleusercontent.com/d/" + m[1] + "=w1000";
  }
  return raw;
}

function formatMalayDateTimeNow_() {
  try {
    return Utilities.formatDate(new Date(), "Asia/Kuala_Lumpur", "dd/MM/yyyy HH:mm");
  } catch (e) {
    return new Date().toISOString();
  }
}

function normalizeAccessStatus_(rawStatus) {
  var s = String(rawStatus || "").trim().toLowerCase();
  if (s === "approved" || s === "lulus" || s === "diluluskan" || s === "aktif" || s === "active") {
    return "Approved";
  }
  if (s === "rejected" || s === "tolak" || s === "ditolak" || s === "batal" || s === "sekat") {
    return "Rejected";
  }
  return "Pending";
}

function getOrCreateAksesTeamSheet_(ss) {
  if (!ss) return null;
  var sheet = findTabByNames_(ss, ["AKSES TEAM", "Akses Team", "AKSES_TEAM", "AksesTeam"]);
  if (!sheet) {
    sheet = ss.insertSheet("AKSES TEAM");
    sheet.appendRow(["ID", "NAMA", "EMAIL", "TARIKH", "STATUS"]);
    sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#1e40af").setFontColor("#ffffff");
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(["ID", "NAMA", "EMAIL", "TARIKH", "STATUS"]);
    sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#1e40af").setFontColor("#ffffff");
  }
  return sheet;
}

function getAksesTeamColumnMap_(sheet) {
  var values = sheet.getDataRange().getDisplayValues();
  var hIdx = values.length > 0 ? findHeaderRowIdx_(values) : 0;
  var header = values.length > hIdx
    ? values[hIdx].map(function(h) { return String(h || "").trim().toUpperCase(); })
    : ["ID", "NAMA", "EMAIL", "TARIKH", "STATUS"];

  var idIdx = findColIdx_(header, ["ID", "ID AKSES", "ID TEAM", "NO"]);
  var nameIdx = findColIdx_(header, ["NAMA", "NAME", "NAMA TEAM", "PENGGUNA"]);
  var emailIdx = findColIdx_(header, ["EMAIL", "E-MEL", "EMEL", "ALAMAT EMAIL"]);
  var dateIdx = findColIdx_(header, ["TARIKH", "DATE", "TARIKH MOHON", "MASA", "TIMESTAMP"]);
  var statusIdx = findColIdx_(header, ["STATUS", "KELULUSAN", "KEADAAN"]);

  return {
    values: values,
    hIdx: hIdx,
    idIdx: idIdx !== -1 ? idIdx : 0,
    nameIdx: nameIdx !== -1 ? nameIdx : 1,
    emailIdx: emailIdx !== -1 ? emailIdx : 2,
    dateIdx: dateIdx !== -1 ? dateIdx : 3,
    statusIdx: statusIdx !== -1 ? statusIdx : 4
  };
}

function readTeamAccessFromSheet_(ss) {
  if (!ss) return [];
  var sheet = findTabByNames_(ss, ["AKSES TEAM", "Akses Team", "AKSES_TEAM", "AksesTeam"]);
  if (!sheet) return [];
  var map = getAksesTeamColumnMap_(sheet);
  if (map.values.length <= map.hIdx + 1) return [];

  var list = [];
  for (var r = map.hIdx + 1; r < map.values.length; r++) {
    var row = map.values[r];
    if (row.join("").trim() === "") continue;
    var email = String(row[map.emailIdx] || "").trim().toLowerCase();
    var nama = String(row[map.nameIdx] || "").trim();
    if (!email && !nama) continue;

    var id = String(row[map.idIdx] || ("AKS-" + r)).trim();
    var tarikh = String(row[map.dateIdx] || "").trim();
    var status = normalizeAccessStatus_(row[map.statusIdx]);

    list.push({
      id: id,
      nama: nama || (email ? email.split("@")[0] : "Ahli Team"),
      name: nama || (email ? email.split("@")[0] : "Ahli Team"),
      email: email,
      tarikh: tarikh,
      requestedAt: tarikh,
      status: status,
      statusLower: status.toLowerCase(),
      rowNumber: r + 1
    });
  }
  return list;
}

function sendTeamApprovalEmail_(record, isResend) {
  var recipient = ADMIN_NOTIFICATION_EMAIL;
  var applicantName = record.nama || record.name || (record.email ? record.email.split("@")[0] : "Ahli Baharu");
  var prefix = isResend ? "[Peringatan] " : "";
  var subject = prefix + "[FrozenBergerak] Permohonan Akses Team Baharu: " + applicantName + " (" + record.email + ")";
  var textBody = "Salam Admin FrozenBergerak,\n\n"
    + "Terdapat permohonan akses ahli team baharu yang direkodkan di tab AKSES TEAM:\n\n"
    + "ID: " + record.id + "\n"
    + "Nama: " + applicantName + "\n"
    + "Email: " + record.email + "\n"
    + "Tarikh: " + record.tarikh + "\n"
    + "Status: " + record.status + "\n\n"
    + "Sila buka aplikasi PWA FrozenBergerak > Akses Pasukan > tab Kelulusan Team untuk menukar status kepada Approved atau Rejected.\n\n"
    + "Terima kasih.";

  var htmlBody = '<div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">'
    + '<h2 style="color: #1e40af; margin-top: 0;">FrozenBergerak \uD83D\uDE9A Permohonan Akses Team</h2>'
    + '<p>Salam Admin FrozenBergerak,</p>'
    + '<p>Ahli pasukan baharu telah mendaftar dan direkodkan ke dalam tab <strong>AKSES TEAM</strong> dengan status <strong>' + record.status + '</strong>:</p>'
    + '<table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f8fafc; border-radius: 8px;">'
    + '<tr><td style="padding: 8px 12px; font-weight: bold; color: #475569; width: 110px;">ID</td><td style="padding: 8px 12px;">' + record.id + '</td></tr>'
    + '<tr><td style="padding: 8px 12px; font-weight: bold; color: #475569;">Nama</td><td style="padding: 8px 12px;">' + applicantName + '</td></tr>'
    + '<tr><td style="padding: 8px 12px; font-weight: bold; color: #475569;">Email</td><td style="padding: 8px 12px; color: #2563eb; font-weight: bold;">' + record.email + '</td></tr>'
    + '<tr><td style="padding: 8px 12px; font-weight: bold; color: #475569;">Tarikh</td><td style="padding: 8px 12px;">' + record.tarikh + '</td></tr>'
    + '<tr><td style="padding: 8px 12px; font-weight: bold; color: #475569;">Status</td><td style="padding: 8px 12px;"><span style="background: #fef3c7; color: #92400e; padding: 3px 10px; border-radius: 999px; font-weight: bold; font-size: 12px;">' + record.status + '</span></td></tr>'
    + '</table>'
    + '<p>Sila log masuk ke akaun Admin (<strong>' + recipient + '</strong>) di PWA dan buka tab <strong>Kelulusan Team</strong> untuk memilih <strong>Approved</strong> atau <strong>Rejected</strong>.</p>'
    + '</div>';

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    body: textBody,
    htmlBody: htmlBody
  });
}

function registerTeamAccessInSheet_(ss, data) {
  var sheet = getOrCreateAksesTeamSheet_(ss);
  if (!sheet) return { success: false, error: "Fail Jadual Team tidak dijumpai." };

  var inner = data.data || {};
  var cleanEmail = String(data.email || inner.email || "").trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, error: "Alamat email diperlukan untuk pendaftaran AKSES TEAM." };
  }

  var inputNama = String(data.nama || data.name || inner.nama || inner.name || "").trim();
  var fallbackNama = cleanEmail.split("@")[0];
  var finalNama = inputNama || fallbackNama;

  var map = getAksesTeamColumnMap_(sheet);
  var foundRowNum = -1;
  var existingRecord = null;
  var maxIdNum = 0;

  for (var r = map.hIdx + 1; r < map.values.length; r++) {
    var row = map.values[r];
    var rowId = String(row[map.idIdx] || "").trim();
    var m = rowId.match(/(\d+)$/);
    if (m && m[1]) {
      var n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxIdNum) maxIdNum = n;
    }

    var rowEmail = String(row[map.emailIdx] || "").trim().toLowerCase();
    if (rowEmail && rowEmail === cleanEmail) {
      foundRowNum = r + 1;
      existingRecord = {
        id: rowId || ("AKS-" + r),
        nama: String(row[map.nameIdx] || finalNama).trim(),
        name: String(row[map.nameIdx] || finalNama).trim(),
        email: cleanEmail,
        tarikh: String(row[map.dateIdx] || formatMalayDateTimeNow_()).trim(),
        status: normalizeAccessStatus_(row[map.statusIdx])
      };
    }
  }

  if (foundRowNum > 0 && existingRecord) {
    if (inputNama && (!existingRecord.nama || existingRecord.nama === fallbackNama)) {
      sheet.getRange(foundRowNum, map.nameIdx + 1).setValue(inputNama);
      existingRecord.nama = inputNama;
      existingRecord.name = inputNama;
    }
    var emailSentExisting = false;
    if (existingRecord.status === "Pending" && data.sendEmail !== false) {
      try {
        sendTeamApprovalEmail_(existingRecord, true);
        emailSentExisting = true;
      } catch (mailErr) {}
    }
    return {
      success: true,
      alreadyExists: true,
      emailSent: emailSentExisting,
      status: existingRecord.status,
      record: existingRecord
    };
  }

  var nextNum = maxIdNum + 1;
  var newId = "AKS-" + (nextNum < 10 ? "0" + nextNum : String(nextNum));
  var nowStr = String(data.tarikh || inner.tarikh || formatMalayDateTimeNow_()).trim();
  var statusStr = "Pending";

  var maxColIdx = Math.max(map.idIdx, map.nameIdx, map.emailIdx, map.dateIdx, map.statusIdx, 4);
  var newRow = [];
  for (var c = 0; c <= maxColIdx; c++) newRow.push("");
  newRow[map.idIdx] = newId;
  newRow[map.nameIdx] = finalNama;
  newRow[map.emailIdx] = cleanEmail;
  newRow[map.dateIdx] = nowStr;
  newRow[map.statusIdx] = statusStr;

  sheet.appendRow(newRow);

  var createdRecord = {
    id: newId,
    nama: finalNama,
    name: finalNama,
    email: cleanEmail,
    tarikh: nowStr,
    requestedAt: nowStr,
    status: statusStr,
    statusLower: "pending"
  };

  var emailSent = false;
  var emailError = "";
  if (data.sendEmail !== false) {
    try {
      sendTeamApprovalEmail_(createdRecord, false);
      emailSent = true;
    } catch (e) {
      emailError = e.toString();
    }
  }

  return {
    success: true,
    alreadyExists: false,
    emailSent: emailSent,
    emailError: emailError || undefined,
    status: statusStr,
    record: createdRecord
  };
}

function updateTeamAccessStatusInSheet_(ss, data) {
  var sheet = getOrCreateAksesTeamSheet_(ss);
  if (!sheet) return { success: false, error: "Fail Jadual Team tidak dijumpai." };

  var inner = data.data || {};
  var targetEmail = String(data.email || inner.email || "").trim().toLowerCase();
  var targetId = String(data.id || inner.id || "").trim();
  var targetStatus = normalizeAccessStatus_(data.status || inner.status || "Pending");

  if (!targetEmail && !targetId) {
    return { success: false, error: "Email atau ID diperlukan untuk kemaskini status AKSES TEAM." };
  }

  var map = getAksesTeamColumnMap_(sheet);
  var foundRowNum = -1;
  var updatedRecord = null;
  var maxIdNum = 0;

  for (var r = map.hIdx + 1; r < map.values.length; r++) {
    var row = map.values[r];
    var rowId = String(row[map.idIdx] || "").trim();
    var m = rowId.match(/(\d+)$/);
    if (m && m[1]) {
      var n = parseInt(m[1], 10);
      if (!isNaN(n) && n > maxIdNum) maxIdNum = n;
    }

    var rowEmail = String(row[map.emailIdx] || "").trim().toLowerCase();
    if ((targetEmail && rowEmail === targetEmail) || (targetId && rowId === targetId)) {
      foundRowNum = r + 1;
      sheet.getRange(foundRowNum, map.statusIdx + 1).setValue(targetStatus);
      var nama = String(row[map.nameIdx] || (rowEmail ? rowEmail.split("@")[0] : "")).trim();
      updatedRecord = {
        id: rowId || ("AKS-" + r),
        nama: nama,
        name: nama,
        email: rowEmail || targetEmail,
        tarikh: String(row[map.dateIdx] || "").trim(),
        requestedAt: String(row[map.dateIdx] || "").trim(),
        status: targetStatus,
        statusLower: targetStatus.toLowerCase()
      };
      break;
    }
  }

  if (foundRowNum === -1 && targetEmail) {
    var nextNum = maxIdNum + 1;
    var newId = targetId || ("AKS-" + (nextNum < 10 ? "0" + nextNum : String(nextNum)));
    var namaNew = String(data.nama || data.name || inner.nama || inner.name || targetEmail.split("@")[0]).trim();
    var nowStr = formatMalayDateTimeNow_();
    var maxColIdx = Math.max(map.idIdx, map.nameIdx, map.emailIdx, map.dateIdx, map.statusIdx, 4);
    var newRow = [];
    for (var c = 0; c <= maxColIdx; c++) newRow.push("");
    newRow[map.idIdx] = newId;
    newRow[map.nameIdx] = namaNew;
    newRow[map.emailIdx] = targetEmail;
    newRow[map.dateIdx] = nowStr;
    newRow[map.statusIdx] = targetStatus;
    sheet.appendRow(newRow);
    updatedRecord = {
      id: newId,
      nama: namaNew,
      name: namaNew,
      email: targetEmail,
      tarikh: nowStr,
      requestedAt: nowStr,
      status: targetStatus,
      statusLower: targetStatus.toLowerCase()
    };
  }

  if (!updatedRecord) {
    return { success: false, error: "Rekod pemohon tidak ditemui di tab AKSES TEAM." };
  }

  return {
    success: true,
    status: targetStatus,
    record: updatedRecord,
    teamAccess: readTeamAccessFromSheet_(ss)
  };
}

function readProductsFromSheet_(ss) {
  var sheet = findTabByNames_(ss, ["Produk", "PRODUK", "Products", "Katalog", "Catalog", "Sheet1"]);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var hIdx = findHeaderRowIdx_(values);
  var header = values[hIdx].map(function(h) { return String(h || "").trim().toUpperCase(); });
  var idIdx = findColIdx_(header, ["ID", "KOD", "CODE", "ID PRODUK", "SKU"]);
  var nameIdx = findColIdx_(header, ["PRODUK", "NAMA PRODUK", "NAMA", "PRODUCT", "ITEM"]);
  var catIdx = findColIdx_(header, ["KATEGORI", "CATEGORY", "JENIS"]);
  var priceIdx = findColIdx_(header, ["HARGA", "PRICE", "HARGA ASAL"], ["PROMO", "DISKAUN"]);
  var promoIdx = findColIdx_(header, ["HARGA PROMO", "PROMO PRICE", "HARGA DISKAUN"]);
  var cookedIdx = findColIdx_(header, ["GAMBAR SIAP MASAK", "GAMBAR MASAK", "GAMBAR 1"]);
  var packIdx = findColIdx_(header, ["GAMBAR PACKAGING", "GAMBAR PACK", "GAMBAR 2"]);
  var imgIdx = findColIdx_(header, ["GAMBAR", "IMAGE", "FOTO", "URL GAMBAR"]);
  var descIdx = findColIdx_(header, ["PENERANGAN", "DESCRIPTION", "NOTA", "INFO"]);
  var statusIdx = findColIdx_(header, ["STATUS", "STOK", "AVAILABILITY"]);

  var list = [];
  for (var r = hIdx + 1; r < values.length; r++) {
    var row = values[r];
    var name = String((nameIdx !== -1 ? row[nameIdx] : row[1]) || "").trim();
    if (!name) continue;
    var id = String((idIdx !== -1 ? row[idIdx] : row[0]) || ("FB-" + r)).trim();
    var category = String((catIdx !== -1 ? row[catIdx] : row[2]) || "Lain-lain").trim();
    var origPrice = parsePriceNum_(priceIdx !== -1 ? row[priceIdx] : row[3]);
    var promoPrice = promoIdx !== -1 ? parsePriceNum_(row[promoIdx]) : 0;
    var finalPrice = (promoPrice > 0 && (origPrice === 0 || promoPrice < origPrice)) ? promoPrice : origPrice;
    var cookedImg = cookedIdx !== -1 ? normalizeDriveImg_(row[cookedIdx]) : "";
    var packImg = packIdx !== -1 ? normalizeDriveImg_(row[packIdx]) : "";
    var genImg = imgIdx !== -1 ? normalizeDriveImg_(row[imgIdx]) : "";
    var statusStr = String((statusIdx !== -1 ? row[statusIdx] : "AVAILABLE") || "").toLowerCase();
    var inStock = statusStr.indexOf("habis") === -1 && statusStr.indexOf("out") === -1 && statusStr.indexOf("tidak") === -1;

    list.push({
      id: id,
      name: name,
      category: category || "Lain-lain",
      price: finalPrice,
      originalPrice: (promoPrice > 0 && origPrice > promoPrice) ? origPrice : undefined,
      promoPrice: promoPrice > 0 ? promoPrice : undefined,
      unit: name.toLowerCase().indexOf("pek") !== -1 ? "" : "1 pek",
      description: String((descIdx !== -1 ? row[descIdx] : "") || "").trim(),
      imageUrl: cookedImg || genImg || packImg,
      cookedImageUrl: cookedImg || undefined,
      packagingImageUrl: packImg || undefined,
      inStock: inStock,
      halalCertified: true
    });
  }
  return list;
}

function readPromosFromSheet_(ss, tabNames, prefix) {
  var sheet = findTabByNames_(ss, tabNames);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var hIdx = findHeaderRowIdx_(values);
  var header = values[hIdx].map(function(h) { return String(h || "").trim().toUpperCase(); });
  var idIdx = findColIdx_(header, ["ID PROMO", "ID", "KOD"]);
  var titleIdx = findColIdx_(header, ["TAJUK PROMO", "TAJUK", "NAMA PROMO", "PRODUK", "NAMA", "TITLE"]);
  var descIdx = findColIdx_(header, ["PENERANGAN", "DESCRIPTION", "NOTA", "INFO"]);
  var imgIdx = findColIdx_(header, ["GAMBAR PROMO", "GAMBAR SIAP MASAK", "GAMBAR", "IMAGE", "FOTO"]);
  var origIdx = findColIdx_(header, ["HARGA ASAL", "HARGA BIASA", "HARGA", "PRICE"], ["PROMO", "DISKAUN"]);
  var promoIdx = findColIdx_(header, ["HARGA PROMO", "PROMO PRICE", "HARGA DISKAUN", "PROMO"]);
  var statusIdx = findColIdx_(header, ["STATUS", "KEADAAN", "STOK"]);

  var list = [];
  for (var r = hIdx + 1; r < values.length; r++) {
    var row = values[r];
    var title = String((titleIdx !== -1 ? row[titleIdx] : "") || "").trim();
    if (!title) continue;
    var statusStr = String((statusIdx !== -1 ? row[statusIdx] : "Aktif") || "").trim();
    var lower = statusStr.toLowerCase();
    if (lower.indexOf("tidak") !== -1 || lower.indexOf("habis") !== -1 || lower.indexOf("tamat") !== -1 || lower === "inactive") continue;

    var origPrice = origIdx !== -1 ? parsePriceNum_(row[origIdx]) : 0;
    var promoPrice = promoIdx !== -1 ? parsePriceNum_(row[promoIdx]) : 0;

    list.push({
      id: String((idIdx !== -1 ? row[idIdx] : "") || (prefix + "-" + r)).trim(),
      title: title,
      description: String((descIdx !== -1 ? row[descIdx] : "") || "").trim(),
      imageUrl: imgIdx !== -1 ? normalizeDriveImg_(row[imgIdx]) : "",
      originalPrice: origPrice > 0 ? origPrice : undefined,
      promoPrice: promoPrice > 0 ? promoPrice : (origPrice > 0 ? origPrice : undefined),
      status: statusStr || "Aktif",
      unit: "1 pek"
    });
  }
  return list;
}

function readSchedulesFromSheet_(ss) {
  var sheet = findTabByNames_(ss, ["JADUAL", "Jadual", "jadual", "JADUAL_PERGERAKAN", "SCHEDULE"]);
  if (!sheet) return [];
  var values = sheet.getDataRange().getDisplayValues();
  if (values.length <= 1) return [];

  var hIdx = findHeaderRowIdx_(values);
  var header = values[hIdx].map(function(h) { return String(h || "").trim().toUpperCase(); });
  var idIdx = findColIdx_(header, ["ID JADUAL", "ID", "KOD", "NO"]);
  var teamIdx = findColIdx_(header, ["NAMA TEAM", "TEAM", "DRIVER", "NAMA"]);
  var dateIdx = findColIdx_(header, ["TARIKH", "DATE", "HARI"]);
  var timeIdx = findColIdx_(header, ["MASA", "TIME", "WAKTU", "SLOT"]);
  var locIdx = findColIdx_(header, ["KAWASAN", "LOCATION", "LOKASI", "LALUAN"]);
  var notesIdx = findColIdx_(header, ["CATATAN", "NOTES", "NOTA"]);
  var statusIdx = findColIdx_(header, ["STATUS", "KEADAAN"]);

  var schedules = [];
  for (var i = hIdx + 1; i < values.length; i++) {
    var row = values[i];
    if (row.join("").trim() === "") continue;
    var id = String((idIdx !== -1 ? row[idIdx] : row[0]) || ("JAD-" + i)).trim();
    var team = String((teamIdx !== -1 ? row[teamIdx] : row[1]) || "").trim();
    var tarikh = String((dateIdx !== -1 ? row[dateIdx] : row[2]) || "Hari Ini").trim();
    var masa = String((timeIdx !== -1 ? row[timeIdx] : row[3]) || "Waktu Operasi").trim();
    var kawasan = String((locIdx !== -1 ? row[locIdx] : row[4]) || "").trim();
    var catatan = String((notesIdx !== -1 ? row[notesIdx] : row[5]) || "").trim();
    var status = String((statusIdx !== -1 ? row[statusIdx] : row[6]) || "Akan Datang").trim();

    if (!kawasan) continue;
    schedules.push({
      id: id,
      team: team,
      teamName: team,
      tarikh: tarikh,
      date: tarikh,
      masa: masa,
      timeSlot: masa,
      kawasan: kawasan,
      locations: kawasan,
      catatan: catatan,
      notes: catatan,
      status: status
    });
  }
  return schedules;
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj || { success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function parsePostPayload_(e) {
  var data = {};
  var raw = (e && e.postData && e.postData.contents) ? String(e.postData.contents) : "";
  var trimmed = raw.trim();

  if (trimmed) {
    try {
      data = JSON.parse(trimmed);
    } catch (pe1) {
      // Sokong borang hidden iframe (enctype="text/plain") yang menambah '=' pada penghujung JSON
      var cleaned = trimmed.replace(/=+$/, "").trim();
      try {
        data = JSON.parse(cleaned);
      } catch (pe2) {
        var firstBrace = cleaned.indexOf("{");
        var lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          try {
            data = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
          } catch (pe3) {}
        }
      }
    }
  }

  if ((!data || typeof data !== "object" || Object.keys(data).length === 0) && e && e.parameter) {
    if (e.parameter.payload) {
      try {
        data = JSON.parse(String(e.parameter.payload));
      } catch (pe4) {
        data = e.parameter;
      }
    } else {
      data = e.parameter;
    }
  }

  return (data && typeof data === "object") ? data : {};
}

// ==========================================
// 1. FUNGSI MEMBACA DATA (GET / fetch)
// ==========================================
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action).trim() : "getAll";

    if (action === "getProducts") {
      var fbSS = openSheetFile_(FROZEN_BERGERAK_SHEET_ID, "Frozen Bergerak", false, ["Produk", "PRODUK"]);
      return jsonResponse_({
        success: true,
        products: readProductsFromSheet_(fbSS)
      });
    }

    if (action === "getPromos") {
      var fbSSPromo = openSheetFile_(FROZEN_BERGERAK_SHEET_ID, "Frozen Bergerak", false, ["Produk", "PRODUK"]);
      return jsonResponse_({
        success: true,
        promos: readPromosFromSheet_(fbSSPromo, ["Alltimepromo", "All Time Promo", "ALL TIME PROMO", "AllTimePromo", "Promo"], "PROMO")
      });
    }

    if (action === "getSeasonalPromos") {
      var fbSSSeasonal = openSheetFile_(FROZEN_BERGERAK_SHEET_ID, "Frozen Bergerak", false, ["Produk", "PRODUK"]);
      var seasonal = readPromosFromSheet_(fbSSSeasonal, ["Seasonal", "Seasonalpromo", "Seasonal Promo", "Promosi Musiman", "Musiman"], "SEA");
      return jsonResponse_({
        success: true,
        promos: seasonal,
        seasonalPromos: seasonal
      });
    }

    if (action === "getSchedules") {
      var jtSS = openSheetFile_(JADUAL_TEAM_SHEET_ID, "Jadual Team", true, ["JADUAL", "Jadual"]);
      return jsonResponse_({
        success: true,
        schedules: readSchedulesFromSheet_(jtSS)
      });
    }

    if (action === "getTeamAccess") {
      var jtTeamSS = openSheetFile_(JADUAL_TEAM_SHEET_ID, "Jadual Team", true, ["AKSES TEAM", "JADUAL", "Jadual"]);
      var accessList = readTeamAccessFromSheet_(jtTeamSS);
      return jsonResponse_({
        success: true,
        teamAccess: accessList,
        adminEmail: ADMIN_NOTIFICATION_EMAIL
      });
    }

    if (action === "checkTeamAccess") {
      var jtCheckSS = openSheetFile_(JADUAL_TEAM_SHEET_ID, "Jadual Team", true, ["AKSES TEAM", "JADUAL", "Jadual"]);
      var targetEmail = (e && e.parameter && e.parameter.email) ? String(e.parameter.email).trim().toLowerCase() : "";
      var allAccess = readTeamAccessFromSheet_(jtCheckSS);
      var matched = null;
      for (var i = 0; i < allAccess.length; i++) {
        if (allAccess[i].email === targetEmail) {
          matched = allAccess[i];
          break;
        }
      }
      return jsonResponse_({
        success: true,
        email: targetEmail,
        found: Boolean(matched),
        status: matched ? matched.status : "Unregistered",
        statusLower: matched ? matched.statusLower : "unregistered",
        record: matched
      });
    }

    // Lalai / action === "getAll": baca KEDUA-DUA fail ("Frozen Bergerak" + "Jadual Team") serentak
    var fbSSAll = openSheetFile_(FROZEN_BERGERAK_SHEET_ID, "Frozen Bergerak", false, ["Produk", "PRODUK"]);
    var jtSSAll = openSheetFile_(JADUAL_TEAM_SHEET_ID, "Jadual Team", true, ["JADUAL", "Jadual"]);
    return jsonResponse_({
      success: true,
      products: readProductsFromSheet_(fbSSAll),
      promos: readPromosFromSheet_(fbSSAll, ["Alltimepromo", "All Time Promo", "ALL TIME PROMO", "AllTimePromo", "Promo"], "PROMO"),
      seasonalPromos: readPromosFromSheet_(fbSSAll, ["Seasonal", "Seasonalpromo", "Seasonal Promo", "Promosi Musiman", "Musiman"], "SEA"),
      schedules: readSchedulesFromSheet_(jtSSAll),
      meta: {
        frozenBergerakConnected: Boolean(fbSSAll),
        jadualTeamConnected: Boolean(jtSSAll),
        syncedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    return jsonResponse_({
      success: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}

// ==========================================
// 2. FUNGSI KEMASKINI / TAMBAH / PADAM (POST)
// ==========================================
function doPost(e) {
  try {
    var data = parsePostPayload_(e);
    var rawAction = String(data.action || (e && e.parameter && e.parameter.action) || "SCHEDULE_CREATE").trim();
    var action = rawAction;

    if (action === "TEAM_ACCESS_APPROVE") {
      action = "TEAM_ACCESS_UPDATE";
      data.status = "Approved";
    } else if (action === "TEAM_ACCESS_REJECT") {
      action = "TEAM_ACCESS_UPDATE";
      data.status = "Rejected";
    }

    // A. Pendaftaran Ahli Team Baharu -> Tab AKSES TEAM (Status: Pending) + Emel Admin
    if (action === "TEAM_ACCESS_REGISTER") {
      var jtRegSS = openSheetFile_(JADUAL_TEAM_SHEET_ID, "Jadual Team", true, ["AKSES TEAM", "JADUAL", "Jadual"]);
      var regRes = registerTeamAccessInSheet_(jtRegSS, data);
      return jsonResponse_(regRes);
    }

    // B. Kemaskini Status Kelulusan Team (Approved / Rejected / Pending) -> Tab AKSES TEAM
    if (action === "TEAM_ACCESS_UPDATE") {
      var jtUpdSS = openSheetFile_(JADUAL_TEAM_SHEET_ID, "Jadual Team", true, ["AKSES TEAM", "JADUAL", "Jadual"]);
      var updRes = updateTeamAccessStatusInSheet_(jtUpdSS, data);
      if (updRes && updRes.success) {
        updRes.action = "TEAM_ACCESS_UPDATE";
      }
      return jsonResponse_(updRes || { success: true, action: "TEAM_ACCESS_UPDATE" });
    }

    // C. Hantar Semula Notifikasi Permohonan ke Emel Admin (maktabahumrr@gmail.com)
    if (action === "TEAM_ACCESS_RESEND") {
      var jtResendSS = openSheetFile_(JADUAL_TEAM_SHEET_ID, "Jadual Team", true, ["AKSES TEAM", "JADUAL", "Jadual"]);
      var resendEmail = String(data.email || (data.data && data.data.email) || "").trim().toLowerCase();
      var listResend = readTeamAccessFromSheet_(jtResendSS);
      var recResend = null;
      for (var rIdx = 0; rIdx < listResend.length; rIdx++) {
        if (listResend[rIdx].email === resendEmail) {
          recResend = listResend[rIdx];
          break;
        }
      }
      if (!recResend) {
        recResend = {
          id: "AKS-BARU",
          nama: String(data.nama || data.name || (resendEmail ? resendEmail.split("@")[0] : "Ahli Team")),
          email: resendEmail,
          tarikh: formatMalayDateTimeNow_(),
          status: "Pending"
        };
      }
      var resendEmailSent = false;
      var resendEmailError = "";
      try {
        sendTeamApprovalEmail_(recResend, true);
        resendEmailSent = true;
      } catch (mailErr) {
        resendEmailError = String(mailErr);
      }
      return jsonResponse_({
        success: true,
        emailSent: resendEmailSent,
        emailError: resendEmailError || undefined,
        message: "Notifikasi emel telah dihantar ke " + ADMIN_NOTIFICATION_EMAIL,
        record: recResend
      });
    }

    // D. Penghantaran notifikasi e-mel admin umum / ujian
    if (action === "send_email_notification" || action === "team_approval_request" || data.type === "team_approval_request") {
      var recipient = data.recipient || data.adminEmail || ADMIN_NOTIFICATION_EMAIL;
      var subject = data.subject || "[FrozenBergerak] Permohonan Kelulusan Akses Team";
      var body = data.body || "Terdapat permohonan akses baharu.";
      var generalEmailSent = false;
      var generalEmailError = "";
      try {
        MailApp.sendEmail({ to: recipient, subject: subject, body: body, htmlBody: data.htmlBody || undefined });
        generalEmailSent = true;
      } catch (mailErr2) {
        generalEmailError = String(mailErr2);
      }
      return jsonResponse_({
        success: true,
        emailSent: generalEmailSent,
        emailError: generalEmailError || undefined,
        message: "Email dihantar ke " + recipient
      });
    }

    // E. Pengurusan Jadual dalam fail "Jadual Team" (Tab JADUAL)
    var ss = openSheetFile_(JADUAL_TEAM_SHEET_ID, "Jadual Team", true, ["JADUAL", "Jadual"]);
    if (!ss) {
      return jsonResponse_({ success: false, error: "Fail Jadual Team tidak dijumpai." });
    }
    var sheet = findTabByNames_(ss, ["JADUAL", "Jadual", "jadual"]);
    if (!sheet) {
      sheet = ss.insertSheet("JADUAL");
      sheet.appendRow(["ID JADUAL", "NAMA TEAM", "TARIKH", "MASA", "KAWASAN", "CATATAN", "STATUS"]);
      sheet.getRange("A1:G1").setFontWeight("bold").setBackground("#1e40af").setFontColor("#ffffff");
    }

    var id = data.idJadual || data.id || (data.data && (data.data.idJadual || data.data.id)) || "JAD-01";
    var namaTeam = data.namaTeam || data.teamName || data.team || (data.data && (data.data.namaTeam || data.data.teamName || data.data.team)) || "Team Frozen 1";
    var tarikh = data.tarikh || data.date || (data.data && (data.data.tarikh || data.data.date)) || "Hari Ini";
    var masa = data.masa || data.timeSlot || (data.data && (data.data.masa || data.data.timeSlot)) || "Waktu Operasi";
    var kawasan = data.kawasan || data.locations || (data.data && (data.data.kawasan || data.data.locations)) || "";
    var catatan = data.catatan || data.notes || (data.data && (data.data.catatan || data.data.notes)) || "";
    var status = data.status || (data.data && data.data.status) || "Akan Datang";

    var rowData = data.row;
    if (!rowData || !Array.isArray(rowData)) {
      rowData = [id, namaTeam, tarikh, masa, kawasan, catatan, status];
    }

    id = (rowData && rowData[0]) || id;
    var lastRow = sheet.getLastRow();
    var foundRow = -1;
    if (lastRow > 1) {
      var idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < idValues.length; i++) {
        if (String(idValues[i][0]).trim() === String(id).trim()) {
          foundRow = i + 2;
          break;
        }
      }
    }

    if (action === "SCHEDULE_DELETE") {
      if (foundRow > 1) sheet.deleteRow(foundRow);
      return jsonResponse_({ success: true, action: action, id: id });
    } else {
      if (foundRow > 1) sheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
      else sheet.appendRow(rowData);
      return jsonResponse_({ success: true, action: action, id: id });
    }
  } catch (err) {
    return jsonResponse_({
      success: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}
