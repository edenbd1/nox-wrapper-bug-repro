// SPDX-License-Identifier: MIT
// Exact code from cdefi-wizard.iex.ec — DOES NOT DECRYPT
pragma solidity ^0.8.28;

import {ERC7984} from "@iexec-nox/nox-confidential-contracts/contracts/token/ERC7984.sol";
import {ERC20ToERC7984Wrapper} from "@iexec-nox/nox-confidential-contracts/contracts/token/extensions/ERC20ToERC7984Wrapper.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";

contract WizardWrapper is ERC20ToERC7984Wrapper {
    constructor(IERC20 underlying)
        ERC7984("Wizard Wrapped Token", "cTKN", "")
        ERC20ToERC7984Wrapper(underlying)
    {}
}
