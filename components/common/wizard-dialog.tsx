"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Stepper } from "@/components/common/stepper";
import { AlertMessage } from "@/components/common/alert-message";
import { Button } from "@/components/ui/button";

export interface WizardStep {
  title: string;
  content: ReactNode;
  /**
   * Return false to block advancing to the next step. The step is responsible
   * for surfacing its own inline (per-field) validation messages.
   */
  validate?: () => boolean;
}

/**
 * Reusable multi-step dialog: a shadcn Dialog containing a {@link Stepper},
 * the current step's content, and Back/Next navigation. The final step shows
 * `finalActions` instead of "Next" (e.g. Publish / Save).
 *
 * Generic and feature-agnostic — drop it into any add/edit flow by passing a
 * `steps` array. Controlled via `open`/`onOpenChange`; step index resets to 0
 * each time it opens.
 */
export function WizardDialog({
  open,
  onOpenChange,
  title,
  description,
  steps,
  finalActions,
  error,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  steps: WizardStep[];
  /** Rendered on the last step in place of "Next". Receives a close() helper. */
  finalActions: (close: () => void) => ReactNode;
  /** External (e.g. submit) error to surface in the body. */
  error?: string | null;
  /** Disables navigation while an async action runs. */
  busy?: boolean;
}) {
  const [step, setStep] = useState(0);

  // Reset to the first step whenever the dialog transitions to open. Adjusting
  // state during render (rather than in an effect) is React's recommended
  // pattern for "reset when a prop changes" and avoids a cascading re-render.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setStep(0);
  }

  const isLast = step === steps.length - 1;
  const current = steps[step];

  const next = () => {
    // The step renders its own inline field errors; just block advancing.
    if (current?.validate && !current.validate()) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="flex max-h-[inherit] flex-1 flex-col overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <Stepper steps={steps.map((s) => s.title)} current={step} />
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {error && <AlertMessage variant="error">{error}</AlertMessage>}
            {current?.content}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border p-4">
            <Button
              type="button"
              variant="ghost"
              onClick={back}
              disabled={step === 0 || busy}
            >
              <ArrowLeft className="size-4" /> Back
            </Button>

            {!isLast ? (
              <Button type="button" onClick={next} disabled={busy}>
                Next <ArrowRight className="size-4" />
              </Button>
            ) : (
              <div className="flex gap-2">
                {finalActions(() => onOpenChange(false))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
