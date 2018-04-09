export {Model} from './model';
export {Store} from './store';
export {Instance} from './instance';

export {ValidationResult} from './validation';

import {NullStore} from './nullStore';
import {MemoryStore} from './memoryStore';
export const stores = { MemoryStore, NullStore };

import * as validators from './validators';
export {validators};