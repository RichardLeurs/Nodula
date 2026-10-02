import { createStore } from 'nodula-framework/store';

globalThis.treeShakingResult = createStore({ ready: true }).ready;