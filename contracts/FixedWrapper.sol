// SPDX-License-Identifier: MIT
// WizardWrapper + addViewer fix
pragma solidity ^0.8.28;

import {ERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984.sol";
import {ERC7984Base} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984Base.sol";
import {ERC20ToERC7984Wrapper} from "@iexec-nox/nox-confidential-contracts/contracts/token/extensions/ERC20ToERC7984Wrapper.sol";
import {Nox, euint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";

contract FixedWrapper is ERC20ToERC7984Wrapper {
    constructor(IERC20 underlying)
        ERC7984("Fixed Wrapped Token", "cTKNf", "")
        ERC20ToERC7984Wrapper(underlying)
    {}

    /// @dev Override _update to add addViewer for both sender and receiver
    function _update(
        address from, address to, euint256 amount
    ) internal override returns (euint256 transferred) {
        transferred = super._update(from, to, amount);

        // Fix: grant viewer access so users can decrypt via Handle Gateway
        ERC7984Storage storage $ = _getERC7984Storage();
        if (to != address(0) && Nox.isInitialized($._balances[to])) {
            Nox.addViewer($._balances[to], to);
        }
        if (from != address(0) && Nox.isInitialized($._balances[from])) {
            Nox.addViewer($._balances[from], from);
        }
    }
}
