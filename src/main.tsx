import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { ChakraBaseProvider, extendTheme } from "@chakra-ui/react";

import { dojoConfig } from "../dojoConfig";
import { setup } from "./dojo/setup";
import { DojoProvider } from "./dojo/DojoContext";
import { WalletProvider } from "./dojo/WalletContext";
import { StarknetProvider } from "./providers/StarknetProvider";
import customTheme from "./theme/theme";
import App from "./App";
import "./index.css";

const theme = extendTheme(customTheme);
const queryClient = new QueryClient();

async function init() {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("React root not found");
  const root = ReactDOM.createRoot(rootElement);

  try {
    const setupResult = await setup(dojoConfig);

    root.render(
      <StarknetProvider>
        <QueryClientProvider client={queryClient}>
          <ChakraBaseProvider theme={theme}>
            <WalletProvider value={setupResult}>
              <DojoProvider value={setupResult}>
                <BrowserRouter>
                  <Toaster />
                  <App />
                </BrowserRouter>
              </DojoProvider>
            </WalletProvider>
          </ChakraBaseProvider>
        </QueryClientProvider>
      </StarknetProvider>
    );
  } catch (e) {
    console.error("Failed to initialize Dojo:", e);
    root.render(
      <ChakraBaseProvider theme={theme}>
        <div
          style={{
            display: "flex",
            height: "100vh",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <h2>Failed to connect</h2>
          <p style={{ color: "#999", maxWidth: 400, textAlign: "center" }}>
            Could not connect to Dojo. Make sure your Slot instance or local
            Katana/Torii are running.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 24px",
              borderRadius: "6px",
              border: "1px solid #555",
              background: "transparent",
              color: "white",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </ChakraBaseProvider>
    );
  }
}

init();
