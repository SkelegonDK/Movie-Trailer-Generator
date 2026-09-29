'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'

/**
 * ThemeProvider component that wraps the NextThemesProvider.
 * It allows setting up theme (light/dark mode) capabilities for the application.
 * Accepts all props from next-themes ThemeProviderProps.
 *
 * @param {ThemeProviderProps} props - The props for the ThemeProvider.
 * @param {React.ReactNode} props.children - The child components to be wrapped by the provider.
 * @param {string} [props.attribute="class"] - The HTML attribute to set with the theme name. Defaults to "class".
 * @param {string} [props.defaultTheme="system"] - The default theme to use. Defaults to "system".
 * @param {boolean} [props.enableSystem=true] - Whether to enable system-based theme detection. Defaults to true.
 * @param {string[]} [props.themes=['light', 'dark']] - Array of available themes. Defaults to ['light', 'dark'].
 * @param {string} [props.storageKey="theme"] - The key used to store the theme in localStorage. Defaults to "theme".
 * @param {boolean} [props.disableTransitionOnChange=false] - Whether to disable CSS transitions when changing themes. Defaults to false.
 * @returns {JSX.Element} The NextThemesProvider wrapping the children.
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
