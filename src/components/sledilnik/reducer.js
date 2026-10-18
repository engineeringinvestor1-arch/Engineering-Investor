/**
 * Money tracker reducer. Plain JS (no JSX) so it can be tested with `node --test`.
 */

import { postDueRecurring, rememberPayee, withPayees } from './store.js';
import { demoData, removeDemo } from './demo.js';

export function reducer(state, action) {
  switch (action.type) {
    case 'state/replace':
      // Uvožena ali iz oblaka naložena kopija je lahko iz časa pred spominom trgovin: takrat se sestavi iz zgodovine.
      return withPayees(action.state, action.state.payees?.length ? action.state.payees : undefined);

    // Vsaka shranjena transakcija si zapomni trgovino in njeno kategorijo (store.js, rememberPayee).
    case 'tx/add':
      return { ...state, transactions: [...state.transactions, action.tx], payees: rememberPayee(state.payees, action.tx) };
    case 'tx/update':
      return {
        ...state,
        transactions: state.transactions.map((t) => t.id === action.tx.id ? action.tx : t),
        payees: rememberPayee(state.payees, action.tx, { count: false }),
      };
    case 'tx/remove':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.id) };

    // Testni podatki za ogled (demo.js): naložijo se k uporabnikovim in se odstranijo brez sledi.
    case 'demo/load':
      return demoData(state, action.today);
    case 'demo/remove':
      return removeDemo(state);

    case 'payee/update':
      return { ...state, payees: (state.payees ?? []).map((p) => p.id === action.payee.id ? action.payee : p) };
    case 'payee/remove':
      return { ...state, payees: (state.payees ?? []).filter((p) => p.id !== action.id) };

    case 'account/add':
      return { ...state, accounts: [...state.accounts, action.account] };
    case 'account/update':
      return { ...state, accounts: state.accounts.map((a) => a.id === action.account.id ? action.account : a) };
    case 'account/remove':
      return { ...state, accounts: state.accounts.filter((a) => a.id !== action.id) };

    case 'category/add':
      return { ...state, categories: [...state.categories, action.category] };
    case 'category/update':
      return { ...state, categories: state.categories.map((c) => c.id === action.category.id ? action.category : c) };
    case 'category/remove':
      return { ...state, categories: state.categories.filter((c) => c.id !== action.id) };

    case 'budget/add':
      return { ...state, budgets: [...state.budgets, action.budget] };
    case 'budget/update':
      return { ...state, budgets: state.budgets.map((b) => b.id === action.budget.id ? action.budget : b) };
    case 'budget/remove':
      return { ...state, budgets: state.budgets.filter((b) => b.id !== action.id) };

    case 'goal/add':
      return { ...state, goals: [...state.goals, action.goal] };
    case 'goal/update':
      return { ...state, goals: state.goals.map((g) => g.id === action.goal.id ? action.goal : g) };
    case 'goal/remove':
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };

    // Zapadli redni stroški se vpišejo sami. Med pogoste trgovine ne gredo: najemnine se ne izbira pri hitrem vnosu.
    case 'recurring/run':
      return postDueRecurring(state, action.today).state;

    case 'recurring/add':
      return { ...state, recurring: [...state.recurring, action.rule] };
    case 'recurring/update':
      return { ...state, recurring: state.recurring.map((r) => r.id === action.rule.id ? action.rule : r) };
    case 'recurring/remove':
      return { ...state, recurring: state.recurring.filter((r) => r.id !== action.id) };

    default:
      return state;
  }
}
