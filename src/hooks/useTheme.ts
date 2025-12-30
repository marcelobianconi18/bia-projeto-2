import { useThemeContext } from '../context/ThemeContext';

export type Theme = "dark" | "light";

// Adaptador para manter compatibilidade com importações antigas, 
// mas delegando a lógica para o novo Contexto Centralizado.
export function useTheme() {
    const { theme, setTheme, toggleTheme } = useThemeContext();
    return { theme, setTheme, toggleTheme };
}
