import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="nexus-card p-6 flex flex-col items-center justify-center text-center my-4 border border-[#F04452]/30 bg-[#0B1120]">
          <div className="w-12 h-12 rounded-full bg-[#F04452]/10 border border-[#F04452]/30 flex items-center justify-center text-[#F04452] mb-3">
            <AlertTriangle size={24} />
          </div>
          <h3 className="font-heading font-semibold text-sm text-[#F1F5FC] mb-1">
            {this.props.fallbackTitle || "Chart Render Interrupted"}
          </h3>
          <p className="text-xs text-[#94A3B8] max-w-md mb-4 font-mono">
            {this.state.error?.message || "An unexpected rendering error occurred."}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-[#386BFF] hover:bg-[#386BFF]/90 text-white text-xs font-semibold transition-colors"
          >
            <RotateCcw size={14} />
            <span>Reload Chart</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
