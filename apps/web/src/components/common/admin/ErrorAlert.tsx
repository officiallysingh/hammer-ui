import { AlertCircle } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
}

const ErrorAlert = ({ message }: ErrorAlertProps) => (
  <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
    <AlertCircle className="h-4 w-4 shrink-0" />
    <span className="font-body">{message}</span>
  </div>
);

export default ErrorAlert;
