// Function to safely grab a CSS variable, with a fallback color
const getVar = (name, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
};

export const PBI_THEME = {
  // These are standard Power BI "Default" theme colors
  colors: [
    getVar('--pbi-color-1', '#118DFF'), // Blue
    getVar('--pbi-color-2', '#12239E'), // Dark Blue
    getVar('--pbi-color-3', '#E66C37'), // Orange
    getVar('--pbi-color-4', '#6B007B'), // Purple
    getVar('--pbi-color-5', '#E044A7'), // Pink
    getVar('--pbi-color-6', '#744EC2'), // Light Purple
    getVar('--pbi-color-7', '#D9B300'), // Yellow
    getVar('--pbi-color-8', '#22a19a'), // Teal
  ],
  accent: getVar('--accent', '#f57c00'),
  text: getVar('--text-primary', '#f0ece4'),
};