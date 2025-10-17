import React from 'react';

export type HeaderTitleContextValue = {
  title: string | null;
  setTitle: (title: string | null) => void;
};

const HeaderTitleContext = React.createContext<HeaderTitleContextValue>({
  title: null,
  setTitle: () => {},
});

export function useHeaderTitle(): HeaderTitleContextValue {
  return React.useContext(HeaderTitleContext);
}

export function HeaderTitleProvider({ title, setTitle, defaultTitle, children }: { title: string | null; setTitle: (title: string | null) => void; defaultTitle: string; children: React.ReactNode }) {
  React.useEffect(() => {
    setTitle(null);
  }, [defaultTitle, setTitle]);

  const value = React.useMemo(() => ({ title, setTitle }), [title, setTitle]);
  return <HeaderTitleContext.Provider value={value}>{children}</HeaderTitleContext.Provider>;
}
