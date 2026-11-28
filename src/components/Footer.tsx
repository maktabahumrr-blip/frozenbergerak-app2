import React from "react";
import { StoreConfig } from "../types";

interface FooterProps {
  config?: StoreConfig | null;
  compact?: boolean;
}

export const Footer: React.FC<FooterProps> = () => {
  return (
    <footer id="main-footer" className="bg-slate-900 text-slate-300 py-4 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 text-center space-y-1">
        <p className="text-[11px] font-medium text-slate-300">
          100% Halal • Simpan -18°C • 8 PG–10 MLM
        </p>
        <p className="text-[11px] text-slate-400">
          © 2020 FrozenBergerak
        </p>
      </div>
    </footer>
  );
};
