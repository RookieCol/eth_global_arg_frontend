import Layout from "./shared/Layout";
import Home from "./pages/Home";
import { PairsProvider } from "./pages/Home/_components/CrosschainSelector/context";
import { WalletProvider } from "./shared/Wallet/context";

function App() {
  return (
    <PairsProvider>
      <WalletProvider>
        <Layout>
          <Home />
        </Layout>
      </WalletProvider>
    </PairsProvider>
  );
}

export default App;
