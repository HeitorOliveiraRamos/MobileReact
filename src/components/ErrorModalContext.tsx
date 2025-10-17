import React from 'react';

export const ErrorModalContext = React.createContext<{ showErrorModal: (title: string, message: string) => void } | null>(null);
