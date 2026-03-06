import { type ThemeConfig } from "@chakra-ui/react";

// =============================================================================
// Provable Games Ecosystem — Design Tokens
// Paleta extraida de Loot Survivor + Summit
// =============================================================================

const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

const theme = {
  config,

  // ---------------------------------------------------------------------------
  // Color palette
  // ---------------------------------------------------------------------------
  colors: {
    // Primary: green spectrum (dominant across Loot Survivor & Summit)
    green: {
      50: "#E6FFE6",
      100: "#B3FFB3",
      200: "#66FF66",
      300: "#33FF66", // neon green — glow, active elements
      400: "#00FF44", // primary accent — borders, highlights
      500: "#00CC33", // buttons, active states
      600: "#009926", // hover states
      700: "#2D5A2D", // panel borders, secondary borders
      800: "#1A3A1A", // panel backgrounds
      900: "#0A1F0A", // dark overlay backgrounds
      950: "#061206", // deepest green-black
    },

    // Gold/yellow — stats, values, currency
    gold: {
      50: "#FFFDE6",
      100: "#FFF7B3",
      200: "#FFED66",
      300: "#FFE033",
      400: "#FFD700", // primary gold — numbers, values
      500: "#E5C100", // secondary gold
      600: "#B39700",
      700: "#806D00",
      800: "#4D4100",
      900: "#332B00",
    },

    // Red — damage, danger, enemy HP
    danger: {
      50: "#FFE6E6",
      100: "#FFB3B3",
      200: "#FF6666",
      300: "#FF3333", // primary red — damage numbers
      400: "#CC2222", // enemy HP bars
      500: "#AA1111",
      600: "#881111",
      700: "#661111",
      800: "#441111",
      900: "#220808",
    },

    // Surface colors — panels, cards, backgrounds
    surface: {
      bg: "#0D0D0D",       // base background (near black)
      panel: "#0F1A0F",    // panel fill (dark green-black)
      card: "#142014",     // card backgrounds
      overlay: "#1A2E1A",  // modal/overlay backgrounds
      border: "#2D5A2D",   // default border (green-tinted)
      borderLight: "#3A6B3A", // hover/active border
      hover: "#1A331A",    // hover state for interactive elements
    },

    // Text colors
    text: {
      primary: "#E8E0D0",    // main text (warm white/bone)
      secondary: "#7A8A7A",  // labels, helper text (grey-green)
      muted: "#556655",      // disabled, very low emphasis
      highlight: "#33FF66",  // highlighted/active text (neon green)
      gold: "#FFD700",       // numeric values, stats
    },
  },

  // ---------------------------------------------------------------------------
  // Semantic tokens (adapt to color mode automatically)
  // ---------------------------------------------------------------------------
  semanticTokens: {
    colors: {
      "bg.base": { default: "#0D0D0D", _dark: "#0D0D0D" },
      "bg.panel": { default: "#0F1A0F", _dark: "#0F1A0F" },
      "bg.card": { default: "#142014", _dark: "#142014" },
      "border.default": { default: "#2D5A2D", _dark: "#2D5A2D" },
      "border.active": { default: "#00FF44", _dark: "#00FF44" },
      "text.primary": { default: "#E8E0D0", _dark: "#E8E0D0" },
      "text.secondary": { default: "#7A8A7A", _dark: "#7A8A7A" },
      "accent.green": { default: "#00FF44", _dark: "#00FF44" },
      "accent.gold": { default: "#FFD700", _dark: "#FFD700" },
      "accent.danger": { default: "#FF3333", _dark: "#FF3333" },
    },
  },

  // ---------------------------------------------------------------------------
  // Typography
  // ---------------------------------------------------------------------------
  fonts: {
    heading: "'EB Garamond', 'Crimson Text', Georgia, serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
  },

  fontSizes: {
    xs: "0.7rem",
    sm: "0.8rem",
    md: "0.9rem",
    lg: "1rem",
    xl: "1.15rem",
    "2xl": "1.4rem",
    "3xl": "1.8rem",
    "4xl": "2.4rem",
  },

  // ---------------------------------------------------------------------------
  // Global styles
  // ---------------------------------------------------------------------------
  styles: {
    global: {
      "*, *::before, *::after": {
        boxSizing: "border-box",
      },
      body: {
        bg: "#0D0D0D",
        color: "#E8E0D0",
        margin: 0,
        minHeight: "100vh",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      },
      "#root": {
        minHeight: "100vh",
      },
      // Scrollbar styling (green-tinted)
      "::-webkit-scrollbar": {
        width: "6px",
      },
      "::-webkit-scrollbar-track": {
        bg: "#0A1F0A",
      },
      "::-webkit-scrollbar-thumb": {
        bg: "#2D5A2D",
        borderRadius: "3px",
      },
      "::-webkit-scrollbar-thumb:hover": {
        bg: "#3A6B3A",
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Component overrides
  // ---------------------------------------------------------------------------
  components: {
    // Buttons — dark with green borders, uppercase labels
    Button: {
      baseStyle: {
        fontWeight: "600",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        fontSize: "sm",
        borderRadius: "3px",
        _focus: {
          boxShadow: "0 0 0 2px rgba(0, 255, 68, 0.3)",
        },
      },
      variants: {
        // Primary — green accent
        primary: {
          bg: "transparent",
          color: "#33FF66",
          border: "1px solid",
          borderColor: "#00FF44",
          _hover: {
            bg: "rgba(0, 255, 68, 0.1)",
            boxShadow: "0 0 12px rgba(0, 255, 68, 0.2)",
          },
          _active: {
            bg: "rgba(0, 255, 68, 0.15)",
          },
        },
        // Secondary — subtle green
        secondary: {
          bg: "transparent",
          color: "#E8E0D0",
          border: "1px solid",
          borderColor: "#2D5A2D",
          _hover: {
            borderColor: "#3A6B3A",
            bg: "rgba(45, 90, 45, 0.2)",
          },
        },
        // Ghost — no border
        ghost: {
          color: "#7A8A7A",
          _hover: {
            color: "#E8E0D0",
            bg: "rgba(45, 90, 45, 0.15)",
          },
        },
        // Danger — red accent
        danger: {
          bg: "transparent",
          color: "#FF3333",
          border: "1px solid",
          borderColor: "#CC2222",
          _hover: {
            bg: "rgba(255, 51, 51, 0.1)",
          },
        },
        // Gold — for special actions
        gold: {
          bg: "transparent",
          color: "#FFD700",
          border: "1px solid",
          borderColor: "#B39700",
          _hover: {
            bg: "rgba(255, 215, 0, 0.1)",
          },
        },
      },
      defaultProps: {
        variant: "primary",
      },
    },

    // Panels — dark green containers
    Card: {
      baseStyle: {
        container: {
          bg: "rgba(15, 26, 15, 0.85)",
          border: "1px solid",
          borderColor: "#2D5A2D",
          borderRadius: "3px",
          backdropFilter: "blur(8px)",
          color: "#E8E0D0",
        },
        header: {
          fontFamily: "'EB Garamond', Georgia, serif",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontSize: "sm",
          fontWeight: "600",
          color: "#33FF66",
          borderBottom: "1px solid #2D5A2D",
          pb: 2,
        },
        body: {
          fontSize: "sm",
        },
      },
    },

    // Headings — serif, uppercase, tracked
    Heading: {
      baseStyle: {
        fontFamily: "'EB Garamond', Georgia, serif",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#E8E0D0",
      },
    },

    // Text
    Text: {
      baseStyle: {
        color: "#E8E0D0",
      },
      variants: {
        label: {
          color: "#7A8A7A",
          fontSize: "xs",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        },
        stat: {
          color: "#FFD700",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: "700",
        },
        damage: {
          color: "#FF3333",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: "700",
        },
        heal: {
          color: "#33FF66",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: "700",
        },
      },
    },

    // Progress bars (HP bars)
    Progress: {
      baseStyle: {
        track: {
          bg: "#1A1A1A",
          borderRadius: "2px",
          border: "1px solid #2D5A2D",
        },
      },
      variants: {
        hp: {
          filledTrack: {
            bg: "linear-gradient(90deg, #009926, #33FF66)",
          },
        },
        hpEnemy: {
          filledTrack: {
            bg: "linear-gradient(90deg, #AA1111, #FF3333)",
          },
        },
        xp: {
          filledTrack: {
            bg: "linear-gradient(90deg, #B39700, #FFD700)",
          },
        },
      },
    },

    // Badge — for types, tiers, status
    Badge: {
      variants: {
        magical: {
          bg: "rgba(0, 255, 68, 0.15)",
          color: "#33FF66",
          border: "1px solid rgba(0, 255, 68, 0.3)",
          fontSize: "xs",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        },
        hunter: {
          bg: "rgba(255, 215, 0, 0.15)",
          color: "#FFD700",
          border: "1px solid rgba(255, 215, 0, 0.3)",
          fontSize: "xs",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        },
        brute: {
          bg: "rgba(255, 51, 51, 0.15)",
          color: "#FF3333",
          border: "1px solid rgba(255, 51, 51, 0.3)",
          fontSize: "xs",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        },
      },
    },

    // Tooltip
    Tooltip: {
      baseStyle: {
        bg: "#142014",
        color: "#E8E0D0",
        border: "1px solid #2D5A2D",
        borderRadius: "3px",
        fontSize: "xs",
        px: 3,
        py: 2,
      },
    },

    // Input
    Input: {
      variants: {
        outline: {
          field: {
            bg: "#0A1F0A",
            borderColor: "#2D5A2D",
            color: "#E8E0D0",
            fontSize: "sm",
            borderRadius: "3px",
            _hover: {
              borderColor: "#3A6B3A",
            },
            _focus: {
              borderColor: "#00FF44",
              boxShadow: "0 0 0 1px rgba(0, 255, 68, 0.3)",
            },
            _placeholder: {
              color: "#556655",
            },
          },
        },
      },
      defaultProps: {
        variant: "outline",
      },
    },

    // Modal
    Modal: {
      baseStyle: {
        dialog: {
          bg: "#0F1A0F",
          border: "1px solid #2D5A2D",
          borderRadius: "4px",
        },
        header: {
          fontFamily: "'EB Garamond', Georgia, serif",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#E8E0D0",
          borderBottom: "1px solid #2D5A2D",
        },
        overlay: {
          bg: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(4px)",
        },
        closeButton: {
          color: "#7A8A7A",
          _hover: {
            color: "#E8E0D0",
          },
        },
      },
    },

    // Divider
    Divider: {
      baseStyle: {
        borderColor: "#2D5A2D",
      },
    },

    // Table — for leaderboard, stats
    Table: {
      variants: {
        simple: {
          th: {
            color: "#7A8A7A",
            borderColor: "#2D5A2D",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontSize: "xs",
            fontWeight: "600",
          },
          td: {
            borderColor: "#1A3A1A",
            fontSize: "sm",
          },
          tbody: {
            tr: {
              _hover: {
                bg: "rgba(45, 90, 45, 0.1)",
              },
            },
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Shadows — green glow effects
  // ---------------------------------------------------------------------------
  shadows: {
    glow: "0 0 12px rgba(0, 255, 68, 0.3)",
    glowStrong: "0 0 20px rgba(0, 255, 68, 0.5)",
    glowGold: "0 0 12px rgba(255, 215, 0, 0.3)",
    glowDanger: "0 0 12px rgba(255, 51, 51, 0.3)",
    panel: "0 4px 24px rgba(0, 0, 0, 0.5)",
  },

  // ---------------------------------------------------------------------------
  // Border radius — angular, minimal rounding
  // ---------------------------------------------------------------------------
  radii: {
    none: "0",
    sm: "2px",
    base: "3px",
    md: "4px",
    lg: "6px",
    xl: "8px",
  },
};

export default theme;
