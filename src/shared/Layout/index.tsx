import Navbar from "../Navbar";
import FaucetButton from "../FaucetButton";

type Props = {
  children: React.ReactNode;
};
export default function Layout(props: Props) {
  const { children } = props;

  return (
    <div className="w-full h-screen flex flex-col bg-transparent relative" style={{ zIndex: 1 }}>
      <Navbar />
      <div className="w-full flex-1 overflow-y-auto bg-transparent relative">
        {children}
        <FaucetButton />
      </div>
    </div>
  );
}
