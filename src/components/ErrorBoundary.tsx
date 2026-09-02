import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Copy, Check } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error | null;
  errorInfo?: ErrorInfo | null;
  copied?: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    try {
      localStorage.removeItem("custom_google_sheet_url");
      localStorage.removeItem("cached_catalog_products");
    } catch {}
    window.location.reload();
  };

  private handleCopy = () => {
    const errorText = this.state.error?.toString() || "Unknown Error";
    const componentStack = this.state.errorInfo?.componentStack || "";
    const fullLog = `[Error]: ${errorText}\n\n[Component Stack]:\n${componentStack}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullLog).then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2500);
      }).catch(() => {});
    }
  };

  public render() {
    if (this.state.hasError) {
      const errorString = this.state.error ? this.state.error.toString() : "Error: Tiada maklumat ralat";
      const componentStack = this.state.errorInfo?.componentStack || "";

      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white max-w-2xl w-full p-5 sm:p-7 rounded-2xl shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                  Ralat Aplikasi Dikesan (Error Log)
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Berikut adalah butiran tepat ralat JavaScript untuk semakan teknikal.
                </p>
              </div>
            </div>

            {/* JavaScript Error Display Box */}
            <div className="space-y-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  1. error.toString()
                </span>
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 font-mono text-xs text-rose-800 break-words whitespace-pre-wrap select-text font-semibold">
                  {errorString}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    2. errorInfo.componentStack
                  </span>
                  <button
                    type="button"
                    id="copy-error-details-btn"
                    onClick={this.handleCopy}
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                  >
                    {this.state.copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">Disalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Ralat</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-[11px] leading-relaxed text-emerald-400 overflow-x-auto max-h-56 overflow-y-auto whitespace-pre select-text">
                  {componentStack || "// Menunggu component stack ralat..."}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                id="error-boundary-reload-btn"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Semula Halaman (Reset Cache)</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

