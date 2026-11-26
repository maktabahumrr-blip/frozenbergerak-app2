import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { MapPin, UserCheck, ChevronDown, Check, Search, X, MessageCircle, AlertCircle } from "lucide-react";
import { AgentContact, DeliveryArea } from "../types";
import { DELIVERY_AREAS } from "../data/deliveryAgents";

interface AreaAgentSelectorProps {
  selectedArea: DeliveryArea | null;
  selectedAgent: AgentContact | null;
  onSelectArea: (area: DeliveryArea) => void;
  onSelectAgent: (agent: AgentContact) => void;
  compact?: boolean;
  label?: string;
  showRequiredBadge?: boolean;
  hideAgentList?: boolean;
  idPrefix?: string;
}

function formatReadableAreaName(name: string): string {
  return String(name || "").replace(/\s*\/\s*/g, " / ");
}

export const AreaAgentSelector: React.FC<AreaAgentSelectorProps> = ({
  selectedArea,
  selectedAgent,
  onSelectArea,
  onSelectAgent,
  compact = false,
  label = "Pilih Kawasan & Agen Penghantaran",
  showRequiredBadge = false,
  hideAgentList = false,
  idPrefix = "delivery",
}) => {
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!isAreaModalOpen) {
      setSearchTerm("");
    }
  }, [isAreaModalOpen]);

  const filteredAreas = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return DELIVERY_AREAS;
    return DELIVERY_AREAS.filter((area) => {
      const matchName = area.name.toLowerCase().includes(q);
      const matchAgent = area.agents.some(
        (ag) => ag.name.toLowerCase().includes(q) || ag.phone.includes(q)
      );
      return matchName || matchAgent;
    });
  }, [searchTerm]);

  const selectedAreaIdx = selectedArea
    ? DELIVERY_AREAS.findIndex((a) => a.id === selectedArea.id)
    : -1;
  const currentArea = selectedAreaIdx >= 0 ? DELIVERY_AREAS[selectedAreaIdx] : selectedArea;
  const agentNamesList = currentArea ? currentArea.agents.map((a) => a.name).join(", ") : "";

  const areaPickerModal = isAreaModalOpen ? (
    <div
      className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/65 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${idPrefix}-modal-title`}
    >
      <div
        className="fixed inset-0"
        onClick={() => setIsAreaModalOpen(false)}
      />

      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] sm:max-h-[82vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-slate-200 bg-white shrink-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3
                id={`${idPrefix}-modal-title`}
                className="text-base font-extrabold text-slate-900 flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Pilih Kawasan Penghantaran</span>
              </h3>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Pilih kawasan anda untuk memaparkan senarai agen bertugas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAreaModalOpen(false)}
              aria-label="Tutup senarai kawasan"
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari kawasan atau nama agen (cth: Nilai, Bangi, Shah Alam)..."
              className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Padam carian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Area List */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 sm:px-4 pt-3 pb-10 space-y-2 bg-slate-50/70">
          {filteredAreas.length === 0 ? (
            <div className="text-center py-10 px-4 text-sm text-slate-500">
              Tiada kawasan atau agen sepadan dengan &quot;{searchTerm}&quot;.
            </div>
          ) : (
            filteredAreas.map((area) => {
              const originalIndex = DELIVERY_AREAS.findIndex((a) => a.id === area.id);
              const isSelected = Boolean(currentArea && area.id === currentArea.id);

              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => {
                    onSelectArea(area);
                    setIsAreaModalOpen(false);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? "bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                      : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/80"
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="text-sm font-bold text-slate-900 whitespace-normal break-words leading-snug">
                      {originalIndex + 1}. {formatReadableAreaName(area.name)}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500 mr-0.5">
                        Agen:
                      </span>
                      {area.agents.map((ag) => (
                        <span
                          key={`${area.id}-${ag.id}`}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold ${
                            isSelected
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {ag.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "border border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div
        className={`bg-slate-50 border border-slate-200 rounded-2xl ${
          compact ? "p-3 space-y-2.5" : "p-3.5 space-y-3"
        } text-left`}
      >
        {/* Header Label */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{label}</span>
          </span>
          {showRequiredBadge && (
            <span className="text-[11px] font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full shrink-0">
              Wajib Pilih
            </span>
          )}
        </div>

        {/* Step 1: Area Trigger Button */}
        <button
          id={`${idPrefix}-area-trigger`}
          type="button"
          onClick={() => setIsAreaModalOpen(true)}
          className={`w-full px-3.5 py-3 bg-white hover:bg-slate-50 border rounded-xl text-left transition-all flex items-center justify-between gap-2.5 shadow-2xs cursor-pointer ${
            currentArea
              ? "border-slate-300 hover:border-blue-400"
              : "border-amber-400 bg-amber-50/30 hover:border-blue-500"
          }`}
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            {currentArea ? (
              <>
                <div className="text-sm font-bold text-slate-900 whitespace-normal break-words leading-snug">
                  {selectedAreaIdx >= 0 ? `${selectedAreaIdx + 1}. ` : ""}
                  {formatReadableAreaName(currentArea.name)}
                </div>
                <div className="text-xs text-slate-500 whitespace-normal break-words leading-snug">
                  Agen tersedia: <span className="font-semibold text-slate-700">{agentNamesList}</span>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-bold text-amber-900 whitespace-normal break-words">
                  Sila pilih kawasan penghantaran anda...
                </div>
                <div className="text-xs text-amber-700">
                  Klik di sini untuk memilih kawasan liputan
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg shrink-0">
            <span>{currentArea ? "Tukar" : "Pilih"}</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </button>

        {/* Step 2: Manual Agent Selection (NEVER defaults silently to Husna) */}
        {!hideAgentList && currentArea && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700 flex-wrap">
              <span className="flex items-center gap-1.5">
                <UserCheck className={`w-4 h-4 shrink-0 ${selectedAgent ? "text-emerald-600" : "text-amber-600"}`} />
                <span>
                  {selectedAgent
                    ? "Agen Bertugas Dipilih:"
                    : "Pilih Agen Secara Manual:"}
                </span>
              </span>
              {selectedAgent ? (
                <span className="font-mono font-bold text-emerald-700 flex items-center gap-1 shrink-0">
                  <MessageCircle className="w-3.5 h-3.5 fill-current" />
                  +{selectedAgent.phone}
                </span>
              ) : (
                <span className="text-amber-700 font-bold flex items-center gap-1 text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Wajib tekan nama agen
                </span>
              )}
            </div>

            <div
              className={`grid gap-2 ${
                currentArea.agents.length === 1 ? "grid-cols-1" : "grid-cols-2"
              }`}
            >
              {currentArea.agents.map((agent) => {
                const isAgentActive = Boolean(selectedAgent && agent.id === selectedAgent.id);
                return (
                  <button
                    key={`${currentArea.id}-${agent.id}`}
                    type="button"
                    onClick={() => onSelectAgent(agent)}
                    className={`px-3 py-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isAgentActive
                        ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/25 shadow-2xs"
                        : "bg-white border-slate-200 text-slate-700 hover:border-blue-400 hover:bg-blue-50/40"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold leading-tight">
                        {agent.name}
                      </div>
                      <div
                        className={`text-xs font-mono leading-tight mt-0.5 ${
                          isAgentActive ? "text-emerald-700 font-semibold" : "text-slate-500"
                        }`}
                      >
                        +{agent.phone}
                      </div>
                    </div>
                    {isAgentActive ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-slate-300 bg-slate-50 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {typeof document !== "undefined" && areaPickerModal
        ? createPortal(areaPickerModal, document.body)
        : null}
    </>
  );
};
