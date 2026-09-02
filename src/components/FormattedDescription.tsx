import React from "react";

interface FormattedDescriptionProps {
  description: string;
  className?: string;
}

// Regex to identify common topic headers in Malaysian product cooking/storage/packaging descriptions
const TOPIC_HEADER_REGEX = /(?<=[.!?]|\s|^)(Penyediaan:|Cara Penyediaan:|Cara Memasak:|Cara Masak:|Cara Hidangan:|Cara Menggoreng:|Air Fryer:|Deep Fry:|Goreng Minyak:|Goreng:|Kukus:|Bakar:|Oven:|Microwave:|Rebus:|Panggang:|Simpanan:|Panduan Simpanan:|Cara Simpan:|Nota:|Nota Penting:|Perhatian:|Tips:|Petua:|Cadangan Hidangan:|Cadangan:|Kandungan:|Ramuan:|Bahan-bahan:|Bahan:|Kuantiti:|Isi Kandungan:)/gi;

/**
 * Splits raw description text into organized paragraphs while preserving all original text.
 */
export function parseDescriptionParagraphs(rawText: string): string[] {
  if (!rawText || !rawText.trim()) return [];

  const text = rawText.trim();

  // If text already has explicit newlines
  if (text.includes("\n")) {
    const rawLines = text.split(/\r?\n+/).map(l => l.trim()).filter(Boolean);
    const result: string[] = [];

    for (const line of rawLines) {
      // Check if this line itself contains multiple inline headers
      const parts = splitByHeaders(line);
      result.push(...parts);
    }
    return result;
  }

  // If text is a single continuous string, split by topic headers
  return splitByHeaders(text);
}

function splitByHeaders(text: string): string[] {
  // Find all matches for topic headers
  const matches = [...text.matchAll(TOPIC_HEADER_REGEX)];

  if (matches.length === 0) {
    // If no topic headers found, check if there are 2 or more distinct sentences that could be split if very long
    // But keep standard sentences together unless they naturally form distinct thoughts
    return [text];
  }

  const sections: string[] = [];
  let lastIndex = 0;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const matchIndex = match.index ?? 0;

    // Grab text before the current header if any
    if (matchIndex > lastIndex) {
      const precedingText = text.substring(lastIndex, matchIndex).trim();
      if (precedingText) {
        sections.push(precedingText);
      }
    }

    // Determine the end of the current section (which is the start of the next match or end of string)
    const nextMatchIndex = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const currentSection = text.substring(matchIndex, nextMatchIndex).trim();

    if (currentSection) {
      sections.push(currentSection);
    }

    lastIndex = nextMatchIndex;
  }

  // Any trailing text
  if (lastIndex < text.length) {
    const trailing = text.substring(lastIndex).trim();
    if (trailing) {
      sections.push(trailing);
    }
  }

  return sections.length > 0 ? sections : [text];
}

/**
 * Formats an individual paragraph: highlights any leading label/topic header cleanly
 */
function renderParagraphContent(para: string) {
  // Check if paragraph starts with a Label: (e.g. "Penyediaan: ...", "Air Fryer: ...", "Nota: ...")
  const labelMatch = para.match(/^([^:\n]{2,30}:)\s*(.*)$/s);

  if (labelMatch) {
    const label = labelMatch[1];
    const body = labelMatch[2];

    return (
      <span>
        <strong className="font-semibold text-slate-900 tracking-tight">{label}</strong>{" "}
        <span className="text-slate-600">{body}</span>
      </span>
    );
  }

  // Check if it's a bullet point
  if (para.startsWith("•") || para.startsWith("-") || para.startsWith("*")) {
    const bulletText = para.replace(/^[•\-\*]\s*/, "");
    return (
      <span className="flex items-start gap-2">
        <span className="text-blue-500 font-bold leading-none mt-1">•</span>
        <span className="text-slate-600">{bulletText}</span>
      </span>
    );
  }

  return <span className="text-slate-600">{para}</span>;
}

export const FormattedDescription: React.FC<FormattedDescriptionProps> = ({
  description,
  className = "",
}) => {
  const paragraphs = parseDescriptionParagraphs(description);

  if (paragraphs.length === 0) {
    return (
      <p className={`text-sm text-slate-500 italic ${className}`}>
        Tiada penerangan tambahan untuk produk ini.
      </p>
    );
  }

  return (
    <div className={`space-y-2.5 text-sm leading-relaxed ${className}`}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-slate-600">
          {renderParagraphContent(paragraph)}
        </p>
      ))}
    </div>
  );
};
