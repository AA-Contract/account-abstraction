// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.12;

enum ManifestFunctionType {
    // Function is not defined.
    NONE,
    // Function belongs to this plugin.
    SELF,
    // Function belongs to an external plugin provided as a dependency during plugin installation.
    DEPENDENCY,
    // Resolve to a magic value to always bypass validation for a given function.
    VALIDATION_ALWAYS_ALLOW,
    // Resolve to a magic value to always fail validation for a given function.
    VALIDATION_ALWAYS_DENY
}

// For functions of type `ManifestFunctionType.DEPENDENCY`, the MSCA MUST find the plugin address
// of the function at `dependencies[dependencyIndex]` during the call to `installPlugin(...)`.
struct ManifestFunction {
    ManifestFunctionType functionType;
    uint8 functionId;
    uint256 dependencyIndex;
}

struct ManifestValidator {
    bytes4 executionSelector;
    ManifestFunction validator;
}

struct ManifestPreValidationHook {
    bytes4 executionSelector;
    ManifestFunction validator;
    ManifestFunction hook;
}

struct ManifestExecutionHook {
    bytes4 executionSelector;
    ManifestFunction preExecHook;
    ManifestFunction postExecHook;
}

struct ManifestStandardExecutionHook {
    ManifestFunction validator;
    ManifestFunction preExecHook;
    ManifestFunction postExecHook;
}

struct ManifestExternalCallPermission {
    address[] contracts;
    bytes4[] functionSelectors;
    bool permitAnyContract;
    bool permitAnySelector;
}

struct PluginManifest {
    // A human-readable name of the plugin.
    string name;
    // The version of the plugin, following the semantic versioning scheme.
    string version;
    // The author field SHOULD be a username representing the identity of the user or organization
    // that created this plugin.
    string author;

    // If this plugin depends on other plugins' validation functions and/or hooks, the interface IDs of
    // those plugins MUST be provided here, with its position in the array matching the `dependencyIndex`
    // members of `ManifestFunction` structs used in the manifest.
    bytes4[] dependencyInterfaceIds;

    // Execution functions defined in this plugin to be installed on the MSCA.
    bytes4[] executionSelectors;
    // Native functions or execution functions already installed on the MSCA that this plugin will be
    // able to call.
    bytes4[] permittedExecutionSelectors;
    // External contract calls that this plugin will be able to make.
    ManifestExternalCallPermission[] permittedExternalCalls;

    ManifestValidator[] userOpValidators;
    ManifestValidator[] runtimeValidators;
    ManifestPreValidationHook[] preUserOpValidationHooks;
    ManifestPreValidationHook[] preRuntimeValidationHooks;
    ManifestExecutionHook[] executionHooks;
    ManifestStandardExecutionHook[] standardExecutionHooks;
}