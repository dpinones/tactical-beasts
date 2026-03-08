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
    // Primary: muted moss/sage spectrum from gameplay HUD
    green: {
      50: "#E9F4ED",
      100: "#D0E5D7",
      200: "#A7CCB5",
      300: "#87B49B",
      400: "#6D9A82",
      500: "#557A66",
      600: "#456352",
      700: "#365043",
      800: "#24372E",
      900: "#16231D",
      950: "#0D1512",
    },

    // Gold/yellow — subdued brass accents
    gold: {
      50: "#F8F3E8",
      100: "#EEDFC0",
      200: "#DFC18B",
      300: "#CEA867",
      400: "#BD9154",
      500: "#A67C49",
      600: "#88633A",
      700: "#6D4F2E",
      800: "#4D3720",
      900: "#2F2214",
    },

    // Red — muted crimson used by enemy indicators
    danger: {
      50: "#F7ECEC",
      100: "#E8CCCC",
      200: "#D7A9A9",
      300: "#C78989",
      400: "#B36E6E",
      500: "#985757",
      600: "#7B4545",
      700: "#603535",
      800: "#432525",
      900: "#291717",
    },

    // Surface colors — panels, cards, backgrounds
    surface: {
      bg: "#0F1714",
      panel: "rgba(21, 34, 28, 0.9)",
      card: "rgba(28, 45, 37, 0.82)",
      overlay: "#182720",
      border: "#4D6D5B",
      borderLight: "#678C78",
      hover: "rgba(110, 154, 129, 0.16)",
    },

    // Text colors
    text: {
      primary: "#E5DED0",
      secondary: "#9AA99B",
      muted: "#6F7F72",
      highlight: "#A7D5BF",
      gold: "#D8B880",
    },
  },

  // ---------------------------------------------------------------------------
  // Semantic tokens (adapt to color mode automatically)
  // ---------------------------------------------------------------------------
  semanticTokens: {
    colors: {
      "bg.base": { default: "#0F1714", _dark: "#0F1714" },
      "bg.panel": { default: "rgba(21, 34, 28, 0.9)", _dark: "rgba(21, 34, 28, 0.9)" },
      "bg.card": { default: "rgba(28, 45, 37, 0.82)", _dark: "rgba(28, 45, 37, 0.82)" },
      "border.default": { default: "#4D6D5B", _dark: "#4D6D5B" },
      "border.active": { default: "#87B49B", _dark: "#87B49B" },
      "text.primary": { default: "#E5DED0", _dark: "#E5DED0" },
      "text.secondary": { default: "#9AA99B", _dark: "#9AA99B" },
      "accent.green": { default: "#A7D5BF", _dark: "#A7D5BF" },
      "accent.gold": { default: "#D8B880", _dark: "#D8B880" },
      "accent.danger": { default: "#C78989", _dark: "#C78989" },
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
        bg: "#0F1714",
        color: "#E5DED0",
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
        bg: "#111C18",
      },
      "::-webkit-scrollbar-thumb": {
        bg: "#4D6D5B",
        borderRadius: "6px",
      },
      "::-webkit-scrollbar-thumb:hover": {
        bg: "#678C78",
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
        borderRadius: "10px",
        _focus: {
          boxShadow: "0 0 0 2px rgba(135, 180, 155, 0.35)",
        },
      },
      variants: {
        // Primary — green accent
        primary: {
          bg: "rgba(45, 74, 61, 0.3)",
          color: "#CDE5D7",
          border: "1px solid",
          borderColor: "#6D9A82",
          _hover: {
            bg: "rgba(87, 122, 102, 0.45)",
            boxShadow: "0 0 0 1px rgba(135, 180, 155, 0.18), 0 8px 18px rgba(0, 0, 0, 0.35)",
          },
          _active: {
            bg: "rgba(87, 122, 102, 0.58)",
          },
        },
        // Secondary — subtle green
        secondary: {
          bg: "rgba(20, 33, 27, 0.7)",
          color: "#D3CCBE",
          border: "1px solid",
          borderColor: "#4D6D5B",
          _hover: {
            borderColor: "#678C78",
            bg: "rgba(103, 140, 120, 0.16)",
          },
        },
        // Ghost — no border
        ghost: {
          color: "#9AA99B",
          _hover: {
            color: "#E5DED0",
            bg: "rgba(103, 140, 120, 0.14)",
          },
        },
        // Danger — red accent
        danger: {
          bg: "rgba(79, 44, 44, 0.32)",
          color: "#D8B2B2",
          border: "1px solid",
          borderColor: "#9A6262",
          _hover: {
            bg: "rgba(117, 69, 69, 0.48)",
          },
        },
        // Gold — for special actions
        gold: {
          bg: "rgba(74, 60, 34, 0.32)",
          color: "#D8B880",
          border: "1px solid",
          borderColor: "#A67C49",
          _hover: {
            bg: "rgba(110, 86, 46, 0.44)",
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
          bg: "rgba(21, 34, 28, 0.88)",
          border: "1px solid",
          borderColor: "#4D6D5B",
          borderRadius: "12px",
          backdropFilter: "blur(8px)",
          color: "#E5DED0",
        },
        header: {
          fontFamily: "'EB Garamond', Georgia, serif",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontSize: "sm",
          fontWeight: "600",
          color: "#A7D5BF",
          borderBottom: "1px solid #4D6D5B",
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
        color: "#E5DED0",
      },
    },

    // Text
    Text: {
      baseStyle: {
        color: "#E5DED0",
        lineHeight: "1.35",
      },
      variants: {
        label: {
          color: "#9AA99B",
          fontSize: "xs",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
        },
        stat: {
          color: "#D8B880",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: "700",
        },
        damage: {
          color: "#C78989",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: "700",
        },
        heal: {
          color: "#A7D5BF",
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: "700",
        },
      },
    },

    // Progress bars (HP bars)
    Progress: {
      baseStyle: {
        track: {
          bg: "rgba(10, 14, 12, 0.9)",
          borderRadius: "6px",
          border: "1px solid #4D6D5B",
        },
      },
      variants: {
        hp: {
          filledTrack: {
            bg: "linear-gradient(90deg, #4A7A63, #87B49B)",
          },
        },
        hpEnemy: {
          filledTrack: {
            bg: "linear-gradient(90deg, #8D5555, #C78989)",
          },
        },
        hpWarning: {
          filledTrack: {
            bg: "linear-gradient(90deg, #8E6B36, #BD9154)",
          },
        },
        xp: {
          filledTrack: {
            bg: "linear-gradient(90deg, #8E6B36, #BD9154)",
          },
        },
      },
    },

    // Badge — for types, tiers, status
    Badge: {
      variants: {
        magical: {
          bg: "rgba(135, 180, 155, 0.16)",
          color: "#BFDCCB",
          border: "1px solid rgba(135, 180, 155, 0.45)",
          fontSize: "xs",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          borderRadius: "6px",
        },
        hunter: {
          bg: "rgba(189, 145, 84, 0.16)",
          color: "#DEC398",
          border: "1px solid rgba(189, 145, 84, 0.45)",
          fontSize: "xs",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          borderRadius: "6px",
        },
        brute: {
          bg: "rgba(199, 137, 137, 0.16)",
          color: "#E0B6B6",
          border: "1px solid rgba(199, 137, 137, 0.45)",
          fontSize: "xs",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          borderRadius: "6px",
        },
      },
    },

    // Tooltip
    Tooltip: {
      baseStyle: {
        bg: "#182720",
        color: "#E5DED0",
        border: "1px solid #4D6D5B",
        borderRadius: "10px",
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
            bg: "rgba(17, 28, 24, 0.9)",
            borderColor: "#4D6D5B",
            color: "#E5DED0",
            fontSize: "sm",
            borderRadius: "10px",
            _hover: {
              borderColor: "#678C78",
            },
            _focus: {
              borderColor: "#87B49B",
              boxShadow: "0 0 0 1px rgba(135, 180, 155, 0.35)",
            },
            _placeholder: {
              color: "#6F7F72",
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
          bg: "#182720",
          border: "1px solid #4D6D5B",
          borderRadius: "14px",
        },
        header: {
          fontFamily: "'EB Garamond', Georgia, serif",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#E5DED0",
          borderBottom: "1px solid #4D6D5B",
        },
        overlay: {
          bg: "rgba(4, 8, 6, 0.75)",
          backdropFilter: "blur(4px)",
        },
        closeButton: {
          color: "#9AA99B",
          _hover: {
            color: "#E5DED0",
          },
        },
      },
    },

    // Divider
    Divider: {
      baseStyle: {
        borderColor: "#4D6D5B",
      },
    },

    // Table — for leaderboard, stats
    Table: {
      variants: {
        simple: {
          th: {
            color: "#9AA99B",
            borderColor: "#4D6D5B",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontSize: "xs",
            fontWeight: "600",
          },
          td: {
            borderColor: "#24372E",
            fontSize: "sm",
          },
          tbody: {
            tr: {
              _hover: {
                bg: "rgba(103, 140, 120, 0.12)",
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
    glow: "0 0 0 1px rgba(135, 180, 155, 0.2), 0 8px 22px rgba(0, 0, 0, 0.36)",
    glowStrong: "0 0 0 1px rgba(167, 213, 191, 0.4), 0 12px 28px rgba(0, 0, 0, 0.44)",
    glowGold: "0 0 0 1px rgba(189, 145, 84, 0.26), 0 8px 22px rgba(0, 0, 0, 0.34)",
    glowDanger: "0 0 0 1px rgba(199, 137, 137, 0.26), 0 8px 22px rgba(0, 0, 0, 0.36)",
    panel: "0 14px 30px rgba(0, 0, 0, 0.38)",
  },

  // ---------------------------------------------------------------------------
  // Border radius — rounded layout language from gameplay panels
  // ---------------------------------------------------------------------------
  radii: {
    none: "0",
    sm: "6px",
    base: "8px",
    md: "10px",
    lg: "12px",
    xl: "16px",
  },
};

export default theme;
