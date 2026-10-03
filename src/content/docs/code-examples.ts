export type WritingStyle = 'declarative' | 'imperative';
export type ComponentStyle = 'class' | 'function' | 'options';
export type CodeVariants = Record<WritingStyle, Record<ComponentStyle, string>>;

export const codeExamples: CodeVariants = {
    declarative: {
        class: `import { Component, reactive } from '@motifx/core';

export class Counter extends Component<HTMLDivElement> {
  state = reactive({ count: 0 });

  view() {
    return <button onclick={() => this.state.count++}>
      Count: {this.state.count}
    </button>;
  }
}`,
        function: `import { reactive } from '@motifx/core';

export function Counter() {
  const state = reactive({ count: 0 });

  return <button onclick={() => state.count++}>
    Count: {state.count}
  </button>;
}`,
        options: `import { reactive } from '@motifx/core';

export const Counter = () => ({
  el: 'div',
  data: reactive({ count: 0 }),

  view() {
    return <button onclick={() => this.data.count++}>
      Count: {this.data.count}
    </button>;
  },
});`
    },
    imperative: {
        class: `import { Component } from '@motifx/core';

export class Counter extends Component<HTMLDivElement> {
  initializeComponent() {
    this.controls.add(
      <button onclick={() => this.controls.add('Another control')}>
        Add a control
      </button>
    );
  }
}`,
        function: `export function Counter() {
  return <div initializeComponent={(component) => {
    component.controls.add(
      <button>Add a control</button>
    );
  }} />;
}`,
        options: `export const Counter = () => ({
  el: 'div',

  initializeComponent() {
    this.controls.add(
      <button>Add a control</button>
    );
  },
});`
    }
};

// A class component is mounted as an instance; Function and Options components go in as a JSX tag.
// Mounting looks the same in both writing styles.
const mountClass = `import { Application } from '@motifx/core';
import { Counter } from './counter';

const app = Application.CreateBuilder().build();
app.run('#app', new Counter());`;

const mountTag = `import { Application } from '@motifx/core';
import { Counter } from './counter';

const app = Application.CreateBuilder().build();
app.run('#app', <Counter />);`;

const mountByComponentStyle: Record<ComponentStyle, string> = {
    class: mountClass,
    function: mountTag,
    options: mountTag
};

export const mountExamples: CodeVariants = {
    declarative: mountByComponentStyle,
    imperative: mountByComponentStyle
};

export const writingStyles: { value: WritingStyle; label: string }[] = [
    { value: 'declarative', label: 'Declarative' },
    { value: 'imperative', label: 'Imperative' }
];

export const componentStyles: { value: ComponentStyle; label: string }[] = [
    { value: 'class', label: 'Class' },
    { value: 'function', label: 'Function' },
    { value: 'options', label: 'Options' }
];
