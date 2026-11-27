import { createContext, useContext, useState, type ReactNode } from 'react';

const HomeStatusContext = createContext({ overPhoto: true, setOverPhoto: (_next: boolean) => {} });

export function HomeStatusProvider({ children }: { children: ReactNode }) {
  const [overPhoto, setOverPhoto] = useState(true);
  return (
    <HomeStatusContext.Provider value={{ overPhoto, setOverPhoto }}>
      {children}
    </HomeStatusContext.Provider>
  );
}

export function useHomeStatus() {
  return useContext(HomeStatusContext);
}
