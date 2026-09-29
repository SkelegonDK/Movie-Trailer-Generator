import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class names or class name arrays into a single string,
 * resolving Tailwind CSS class conflicts using tailwind-merge.
 * Useful for conditionally applying Tailwind classes in React components.
 *
 * @param {...ClassValue} inputs - A list of class values to combine. 
 *   Each input can be a string, an array of strings, or an object with boolean values.
 * @returns {string} A string of combined and merged Tailwind CSS class names.
 * @example
 * cn("p-4", "bg-red-500", { "text-white": true, "rounded-lg": false });
 * // Returns: "p-4 bg-red-500 text-white"
 *
 * cn("px-2 py-1 bg-red hover:bg-dark-red", "p-4");
 * // Returns: "bg-red hover:bg-dark-red p-4" (p-4 overrides px-2 and py-1)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
