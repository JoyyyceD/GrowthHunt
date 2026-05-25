'use client'

/**
 * CopilotKit provider — gives our pages a place to register agent-readable
 * state via useCopilotReadable() and frontend actions via useCopilotAction().
 *
 * We do NOT use CopilotKit's built-in chat runtime — our orchestrator already
 * handles message flow at /api/gtm/chat/stream. We still need a registered
 * "default" agent so useCopilotReadable has somewhere to attach; we provide
 * a minimal no-op AbstractAgent subclass via `agents__unsafe_dev_only`.
 *
 * Then in ChatPanel:
 *   - We read the registered readables via `useCopilotContext().getContextString(...)`
 *   - Ship that string to /api/gtm/chat/stream as `page_context`
 *   - Backend injects into triage + loop prompts
 */
import { CopilotKit } from '@copilotkit/react-core'
import { AbstractAgent, type BaseEvent, type RunAgentInput } from '@ag-ui/client'
import { EventType } from '@ag-ui/core'
import { Observable } from 'rxjs'
import { useMemo, type ReactNode } from 'react'

/**
 * No-op agent — CopilotKit's AgentRegistry needs an agent to exist for the
 * useCopilotReadable side-effect store to attach to. We never call .run()
 * because all real chat goes through our own SSE endpoint.
 */
class NoopAgent extends AbstractAgent {
  run(_input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((sub) => {
      sub.next({ type: EventType.RUN_STARTED } as BaseEvent)
      sub.next({ type: EventType.RUN_FINISHED } as BaseEvent)
      sub.complete()
    })
  }
}

export function CopilotProvider({ children }: { children: ReactNode }) {
  const agents = useMemo(() => ({
    default: new NoopAgent({
      agentId: 'default',
      description: 'GrowthHunt GTM frontend-state collector (no-op; real chat at /api/gtm/chat/stream)',
    }),
  }), [])

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      showDevConsole={false}
      agents__unsafe_dev_only={agents}
    >
      {children}
    </CopilotKit>
  )
}
