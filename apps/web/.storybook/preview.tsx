import type { Preview } from '@storybook/nextjs-vite'
import React from 'react'
import {
  NuqsTestingAdapter,
  type OnUrlUpdateFunction,
} from 'nuqs/adapters/testing'
import '../src/app/globals.css'

// Per-story URL state: `parameters.nuqs.searchParams` seeds the URL and
// `parameters.nuqs.onUrlUpdate` receives every update. Without it, a story
// starts with empty search params.
interface NuqsParameters {
  searchParams?: string | URLSearchParams | Record<string, string>
  onUrlUpdate?: OnUrlUpdateFunction
}

const preview: Preview = {
  decorators: [
    (Story, { parameters }) => {
      const nuqs = parameters.nuqs as NuqsParameters | undefined
      return (
        <NuqsTestingAdapter
          hasMemory
          searchParams={nuqs?.searchParams}
          onUrlUpdate={nuqs?.onUrlUpdate}
        >
          <Story />
        </NuqsTestingAdapter>
      )
    },
    (Story) => (
      <div style={{ backgroundColor: 'var(--color-background)', minHeight: '100vh', padding: '1rem' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;