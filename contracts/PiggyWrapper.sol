// SPDX-License-Identifier: MIT
// Same functionality as WizardWrapper but uses Nox.add/sub — DECRYPTS CORRECTLY
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Nox, euint256} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";

contract PiggyWrapper {
    IERC20 public immutable underlying;
    string public name;
    string public symbol;

    mapping(address => euint256) private _balances;
    euint256 private _totalSupply;

    event Wrapped(address indexed to, uint256 amount);

    constructor(IERC20 underlying_) {
        underlying = underlying_;
        name = "Piggy Wrapped Token";
        symbol = "cTKNp";
        _totalSupply = Nox.toEuint256(0);
        Nox.allowThis(_totalSupply);
    }

    function confidentialBalanceOf(address account) public view returns (euint256) {
        return _balances[account];
    }

    function wrap(address to, uint256 amount) external returns (euint256) {
        SafeERC20.safeTransferFrom(underlying, msg.sender, address(this), amount);

        euint256 encAmount = Nox.toEuint256(amount);

        if (!Nox.isInitialized(_balances[to])) {
            _balances[to] = Nox.toEuint256(0);
        }

        // Nox.add — produces handles the Runner processes instantly
        _balances[to] = Nox.add(_balances[to], encAmount);
        Nox.allowThis(_balances[to]);
        Nox.allow(_balances[to], to);
        Nox.addViewer(_balances[to], to);

        _totalSupply = Nox.add(_totalSupply, encAmount);
        Nox.allowThis(_totalSupply);

        emit Wrapped(to, amount);
        return _balances[to];
    }
}
