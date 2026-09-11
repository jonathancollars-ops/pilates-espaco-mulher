const React = require('react');

function createRenderer() {
  const hooks = [];
  let hookIndex = 0;
  let effects = [];

  const dispatcher = {
    useState(initial) {
      const idx = hookIndex++;
      if (hooks[idx] === undefined) {
        hooks[idx] = typeof initial === 'function' ? initial() : initial;
      }
      const setState = (newVal) => {
        hooks[idx] = typeof newVal === 'function' ? newVal(hooks[idx]) : newVal;
      };
      return [hooks[idx], setState];
    },
    useRef(initial) {
      const idx = hookIndex++;
      if (hooks[idx] === undefined) {
        hooks[idx] = { current: initial };
      }
      return hooks[idx];
    },
    useEffect(fn, deps) {
      const idx = hookIndex++;
      const prev = hooks[idx];
      let hasChanged = true;
      if (prev && deps) {
        hasChanged = deps.some((d, i) => !Object.is(d, prev.deps[i]));
      }
      if (hasChanged) {
        effects.push(fn);
        hooks[idx] = { deps };
      }
    },
    useMemo(fn, deps) {
      const idx = hookIndex++;
      const prev = hooks[idx];
      if (prev && deps && deps.every((d, i) => Object.is(d, prev.deps[i]))) {
        return prev.value;
      }
      const value = fn();
      hooks[idx] = { value, deps };
      return value;
    },
    useCallback(fn, deps) {
      return dispatcher.useMemo(() => fn, deps);
    },
    useId() {
      return `id-${hookIndex++}`;
    },
    readContext(ctx) {
      return ctx._currentValue;
    },
  };

  function render(Component, props) {
    hookIndex = 0;
    effects = [];
    const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    const prevDispatcher = internals.H;
    internals.H = dispatcher;
    let result;
    try {
      result = Component(props);
    } finally {
      internals.H = prevDispatcher;
    }
    for (const eff of effects) {
      try {
        eff();
      } catch (e) {}
    }
    return result;
  }

  return { render };
}

function render(Component, props) {
  const instance = createRenderer();
  return instance.render(Component, props);
}

module.exports = {
  createRenderer,
  render,
};
