import { useEffect, useState } from "react";
import MembershipUpgradeModal from "./MembershipUpgradeModal";

type MembershipLevel = "Normal" | "Silver" | "Gold" | "Platinum";

export default function MembershipUpgradeListener() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradedLevel, setUpgradedLevel] = useState<MembershipLevel>("Normal");

  useEffect(() => {
    const handleUpgrade = (event: CustomEvent<{ newLevel: MembershipLevel }>) => {
      setUpgradedLevel(event.detail.newLevel);
      setShowUpgradeModal(true);
    };

    window.addEventListener('membershipUpgrade' as any, handleUpgrade);

    return () => {
      window.removeEventListener('membershipUpgrade' as any, handleUpgrade);
    };
  }, []);

  return (
    <MembershipUpgradeModal
      open={showUpgradeModal}
      onClose={() => setShowUpgradeModal(false)}
      newLevel={upgradedLevel}
    />
  );
}
