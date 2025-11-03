import React from "react";
import { Layout, Text } from "@stellar/design-system";
import { Box } from "../components/layout/Box";
import { GovernanceTest } from "../components/GovernanceTest"; 

const Governance: React.FC = () => (
    <Layout.Content>
        <Layout.Inset>
            <Box gap="lg">
                <Box gap="sm">
                    <Text as="h1" size="xl" weight="bold">
                        Governance Dashaboard
                    </Text>
                    <Text as="p" size="md" style={{color: "var(--sds-clr-gray-600)"}}>
                        Manage and monitor the governance contract parameters. View current collateral ratins and execute governance chnages.
                    </Text>
                </Box>
                <GovernanceTest></GovernanceTest>
            </Box>
        </Layout.Inset>
    </Layout.Content>
);

export default Governance;
