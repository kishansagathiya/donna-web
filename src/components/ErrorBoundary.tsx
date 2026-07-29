import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportError } from "../services/errorReporting";
import { Button } from "./ui/Button";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, {
      componentStack: (info.componentStack ?? "").slice(0, 2000),
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-donna-surface px-6 text-center">
          <h1 className="text-xl font-semibold text-donna-text">
            Something went wrong
          </h1>
          <p className="max-w-md text-sm text-donna-muted">
            Donna hit an unexpected error. Reload to try again.
          </p>
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
