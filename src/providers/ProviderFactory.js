import AnikaiProvider from "./AnikaiProvider.js";

const providers = {
    anikai: new AnikaiProvider()
};

class ProviderFactory {
    /**
     * Get a provider instance.
     * Always returns AnikaiProvider.
     * @returns {import("./BaseProvider").default}
     */
    static getProvider() {
        return providers.anikai;
    }
}

export default ProviderFactory;
