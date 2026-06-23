"use client";

import type { Routine, RoutineMode } from "@/lib/types";
import { exercisesForMode } from "@/lib/db";
import Modal from "./Modal";

interface Props {
  routine: Routine | null;
  open: boolean;
  onClose: () => void;
  onSelect: (mode: RoutineMode) => void;
}

/** Asks which session length to run before starting a routine. */
export default function ModeDialog({ routine, open, onClose, onSelect }: Props) {
  if (!routine) return null;
  const friendCount = exercisesForMode(routine, "with_friend").length;
  const soloCount = exercisesForMode(routine, "solo").length;

  const Option = ({
    mode,
    title,
    subtitle,
  }: {
    mode: RoutineMode;
    title: string;
    subtitle: string;
  }) => (
    <button
      onClick={() => onSelect(mode)}
      className="flex w-full items-center justify-between rounded-xl border border-hairline bg-elevated px-4 py-3.5 text-left transition-colors hover:border-accent active:bg-hairline"
    >
      <div>
        <div className="font-semibold text-white">{title}</div>
        <div className="text-sm text-muted">{subtitle}</div>
      </div>
      <span className="text-accent">›</span>
    </button>
  );

  return (
    <Modal open={open} onClose={onClose} variant="center" labelledBy="mode-title">
      <div className="p-5">
        <h2 id="mode-title" className="text-lg font-bold text-white">
          {routine.name}
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          How are you training today?
        </p>
        <div className="space-y-3">
          <Option
            mode="with_friend"
            title="With a Friend"
            subtitle={`${friendCount} exercises · shorter session`}
          />
          <Option
            mode="solo"
            title="Solo"
            subtitle={`${soloCount} exercises · full session`}
          />
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl py-2.5 text-sm font-medium text-muted transition-colors hover:text-white"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
