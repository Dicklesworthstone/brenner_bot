"use client";

import Link from "next/link";

function FlaskConicalIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 3.75v4.5m0 0H9A5.25 5.25 0 003.75 13.5v0A5.25 5.25 0 009 18.75h6a5.25 5.25 0 005.25-5.25v0A5.25 5.25 0 0015 8.25h-.75m-4.5 0h4.5m0 0v-4.5"
      />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function BookOpenIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.75c-1.75-1.5-4.25-2.5-6.75-2.5v13.5c2.5 0 5 1 6.75 2.5m0-16c1.75-1.5 4.25-2.5 6.75-2.5v13.5c-2.5 0-5 1-6.75 2.5m0-16v16"
      />
    </svg>
  );
}

export type DemoFeaturePreviewProps = {
  threadId: string;
  featureName: string;
  featureDescription: string;
  learnMoreLink?: string;
};

export function DemoFeaturePreview({
  threadId,
  featureName,
  featureDescription,
  learnMoreLink = "/tutorial/quick-start",
}: DemoFeaturePreviewProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in-up">
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-6">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center size-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
            <FlaskConicalIcon className="size-6" />
          </div>
          <div className="space-y-3">
            <h1 className="text-xl font-bold text-amber-900 dark:text-amber-100">
              {featureName} - Demo Preview
            </h1>
            <p className="text-sm text-amber-700 dark:text-amber-300">{featureDescription}</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              This feature is available when running BrennerBot locally with Lab Mode enabled.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/sessions/${threadId}`}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Demo Session
        </Link>
        <Link
          href={learnMoreLink}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:shadow-md transition-shadow"
        >
          <BookOpenIcon className="size-4" />
          Learn how to set up
        </Link>
      </div>
    </div>
  );
}
