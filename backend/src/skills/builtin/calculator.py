"""Calculator Skill - safe mathematical expression evaluator."""
from __future__ import annotations

import logging
import ast
import operator
import math
from typing import Any

from ..protocol import BaseSkill, SkillManifest, register_skill

logger = logging.getLogger(__name__)


# Safe math functions available in calculator
SAFE_MATH_FUNCS = {
    "abs": abs,
    "round": round,
    "min": min,
    "max": max,
    "sum": sum,
    "pow": pow,
    "sqrt": math.sqrt,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "log": math.log,
    "log10": math.log10,
    "exp": math.exp,
    "pi": math.pi,
    "e": math.e,
}

SAFE_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


@register_skill
class CalculatorSkill(BaseSkill):
    """
    Safe mathematical expression calculator.
    
    Evaluates mathematical expressions using a safe AST-based evaluator
    that only allows numbers, operators, and predefined math functions.
    
    Manifest:
        name: calculator
        version: 1.0.0
        description: Safe mathematical expression evaluator
        dependencies: []
        author: ClawTeam
    """

    manifest: SkillManifest = {
        "name": "calculator",
        "version": "1.0.0",
        "description": "Safe mathematical expression evaluator",
        "dependencies": [],
        "author": "ClawTeam",
        "tags": ["math", "calculator", "arithmetic"],
    }

    async def execute(self, params: dict, context: dict) -> dict:
        """
        Evaluate a mathematical expression.
        
        Args:
            params:
                - expression (str, required): Math expression to evaluate
                    Examples: "2 + 3", "sqrt(16) * 5", "pi * 2"
                - precision (int, optional): Decimal places in result (default 10)
            context: Agent context (not used)
            
        Returns:
            dict with expression, result, success
        """
        expression = params.get("expression")
        if not expression:
            return {"error": "Missing required parameter: expression", "success": False}
        
        precision = int(params.get("precision", 10))
        
        try:
            result = self._eval_expr(expression)
            rounded = round(result, precision)
            return {
                "success": True,
                "expression": expression,
                "result": rounded,
                "raw_result": result,
                "precision": precision,
            }
        except ZeroDivisionError:
            return {
                "success": False,
                "expression": expression,
                "error": "Division by zero",
            }
        except Exception as e:
            return {
                "success": False,
                "expression": expression,
                "error": f"Evaluation error: {str(e)}",
            }

    def _eval_expr(self, expression: str) -> float:
        """Evaluate a safe mathematical expression using AST."""
        node = ast.parse(expression, mode="eval")
        return self._eval_node(node.body)

    def _eval_node(self, node: ast.AST) -> Any:
        """Recursively evaluate an AST node."""
        if isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)):
                return node.value
            raise TypeError(f"Unsupported constant: {type(node.value)}")
        
        elif isinstance(node, ast.Num):  # Python < 3.8 compat
            return node.n
        
        elif isinstance(node, ast.BinOp):
            left = self._eval_node(node.left)
            right = self._eval_node(node.right)
            op_func = SAFE_OPS.get(type(node.op))
            if op_func is None:
                raise TypeError(f"Unsupported binary operator: {type(node.op)}")
            return op_func(left, right)
        
        elif isinstance(node, ast.UnaryOp):
            operand = self._eval_node(node.operand)
            op_func = SAFE_OPS.get(type(node.op))
            if op_func is None:
                raise TypeError(f"Unsupported unary operator: {type(node.op)}")
            return op_func(operand)
        
        elif isinstance(node, ast.Call):
            func_name = node.func.id if isinstance(node.func, ast.Name) else None
            if func_name not in SAFE_MATH_FUNCS:
                raise NameError(f"Unsupported function: {func_name}")
            
            args = [self._eval_node(arg) for arg in node.args]
            kwargs = {
                kw.arg: self._eval_node(kw.value)
                for kw in node.keywords
            }
            return SAFE_MATH_FUNCS[func_name](*args, **kwargs)
        
        elif isinstance(node, ast.Name):
            if node.id in SAFE_MATH_FUNCS:
                return SAFE_MATH_FUNCS[node.id]
            raise NameError(f"Unknown name: {node.id}")
        
        else:
            raise TypeError(f"Unsupported AST node: {type(node).__name__}")
