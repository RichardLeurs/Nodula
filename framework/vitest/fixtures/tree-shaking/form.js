import { createForm } from 'nodula-framework/form';

globalThis.treeShakingResult = createForm({ message: 'kept' }).values.message;