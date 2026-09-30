import { SeverityNumber } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';

const posthogProjectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;

let posthogLogger: ReturnType<LoggerProvider['getLogger']> | undefined;
let posthogLogProvider: LoggerProvider | undefined;

if (posthogProjectToken && posthogHost) {
  const exporter = new OTLPLogExporter({
    url: `${posthogHost.replace(/\/$/, '')}/i/v1/logs`,
    headers: { Authorization: `Bearer ${posthogProjectToken}` },
  });

  posthogLogProvider = new LoggerProvider({
    processors: [new BatchLogRecordProcessor({ exporter })],
  });
  posthogLogger = posthogLogProvider.getLogger('milevo.posthog');
} else if (process.env.NODE_ENV === 'development') {
  const missingVariable = posthogProjectToken
    ? 'NEXT_PUBLIC_POSTHOG_HOST'
    : 'NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN';
  throw new Error(
    `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`
  );
}

type LogAttributes = Record<string, string | number | boolean>;

export async function logPostHogInfo(body: string, attributes: LogAttributes) {
  posthogLogger?.emit({
    severityNumber: SeverityNumber.INFO,
    severityText: 'INFO',
    body,
    attributes,
  });
  await posthogLogProvider?.forceFlush();
}

export async function logPostHogWarn(body: string, attributes: LogAttributes) {
  posthogLogger?.emit({
    severityNumber: SeverityNumber.WARN,
    severityText: 'WARN',
    body,
    attributes,
  });
  await posthogLogProvider?.forceFlush();
}
