import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem("bia_theme") as Theme | null;
        return saved ?? "dark";
    });

    useEffect(() => {
        localStorage.setItem("bia_theme", theme);
        const root = document.documentElement;
        root.classList.toggle("theme-light", theme === "light");
        root.setAttribute("data-theme", theme);
    }, [theme]);

    // Force one-time apply on mount just to be sure (though useState initializer helps)
    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle("theme-light", theme === "light");
    }, []);

    return { theme, setTheme };
}
