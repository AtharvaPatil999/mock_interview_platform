"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";

const UserContext = createContext<User | null>(null);

export const UserProvider = ({ user, children }: { user: User | null; children: ReactNode }) => {
    const memoizedUser = useMemo(() => user, [user?.id]);

    return (
        <UserContext.Provider value={memoizedUser}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
};
