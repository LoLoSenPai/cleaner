import React from 'react';
import { AppPage } from '@/components/app-page';
// import SwapScreen from '@/components/swap/swap-screen';
import DustSweepCTA from '@/components/swap/dust-sweep-cta'

export default function SwapTab() {
  return (
    <AppPage>
      <DustSweepCTA />
      {/* <SwapScreen /> */}
    </AppPage>
  );
}
