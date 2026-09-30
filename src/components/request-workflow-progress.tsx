import { useEffect, useRef } from 'react';

import type { RequestedUserStageProgress } from '@/generated/models/requested-user-stage-progress-model';
import type { RequestStageConfiguration } from '@/generated/models/request-stage-configuration-model';
import { sameDataverseId } from '@/lib/provisioning-utils';

type Props = {
  stages: RequestStageConfiguration[];
  progress: RequestedUserStageProgress[];
  pending: boolean;
  disabled: boolean;
  forceFinal: boolean;
  optimisticStageId?: string;
  onSelect: (stage: RequestStageConfiguration) => void;
};

export function RequestWorkflowProgress({ stages, progress, pending, disabled, forceFinal, optimisticStageId, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const progressByName = new Map(progress.filter((entry: RequestedUserStageProgress) => entry.workflowStageOption?.stageName).map((entry: RequestedUserStageProgress) => [entry.workflowStageOption!.stageName.trim().toLowerCase(), entry]));
  const optimisticIndex = optimisticStageId ? stages.findIndex((stage: RequestStageConfiguration) => sameDataverseId(stage.id, optimisticStageId)) : -1;
  const explicitIndex = stages.findIndex((stage: RequestStageConfiguration) => progressByName.get(stage.stageName.trim().toLowerCase())?.stateKey === 'InProgress');
  const completedIndex = stages.reduce((last: number, stage: RequestStageConfiguration, index: number) => progressByName.get(stage.stageName.trim().toLowerCase())?.stateKey === 'Completed' ? index : last, -1);
  const activeIndex = forceFinal ? stages.length - 1 : optimisticIndex >= 0 ? optimisticIndex : explicitIndex >= 0 ? explicitIndex : completedIndex >= stages.length - 1 ? stages.length - 1 : 0;

  useEffect(() => {
    scrollRef.current?.querySelector<HTMLButtonElement>('[aria-current="step"]')?.focus({ preventScroll: true });
  }, [activeIndex]);

  return <div ref={scrollRef} className="overflow-x-auto pb-2 pt-3"><ol className="flex min-w-max items-start" aria-label="Workflow progression">{stages.map((stage: RequestStageConfiguration, index: number) => {
    const complete = index < activeIndex || forceFinal;
    const current = index === activeIndex && !forceFinal;
    const canMove = index < activeIndex || index === activeIndex + 1;
    const stateClass = complete
      ? 'workflow-orb--completed'
      : current
        ? 'workflow-orb--active'
        : 'workflow-orb--pending';
    return <li key={stage.id} className="relative flex w-40 shrink-0 flex-col items-center sm:w-44">{index > 0 && <span className={`absolute right-1/2 top-5 h-0.5 w-1/2 ${index <= activeIndex ? 'bg-status-success' : 'bg-border'}`} aria-hidden="true" />}{index < stages.length - 1 && <span className={`absolute left-1/2 top-5 h-0.5 w-1/2 ${index < activeIndex ? 'bg-status-success' : 'bg-border'}`} aria-hidden="true" />}<button type="button" className={`workflow-orb relative z-10 grid size-10 place-items-center rounded-full border transition-[border-color,box-shadow,transform] ${stateClass}`} disabled={pending || disabled || !canMove} onClick={() => onSelect(stage)} aria-current={current ? 'step' : undefined} aria-label={`${stage.stageName}: ${complete ? 'Completed' : current ? 'Active' : 'Not started'}`}><span className="size-2 rounded-full bg-current" /></button><span className="mt-2 w-full px-2 text-center text-sm font-semibold">{stage.stageName}</span></li>;
  })}</ol></div>;
}
