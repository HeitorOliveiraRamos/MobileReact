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

export function HeaderTitleProvider({ defaultTitle, children }: { defaultTitle: string; children: React.ReactNode }) {
  const [title, setTitle] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTitle(null);
  }, [defaultTitle]);

  const value = React.useMemo(() => ({ title, setTitle }), [title]);
  return <HeaderTitleContext.Provider value={value}>{children}</HeaderTitleContext.Provider>;
}

