# Add or update a package script

## Inputs

The operation record must identify:

- target package;
- script name;
- intended command;
- whether an existing script may be replaced.

## Procedure

1. Inspect the existing script.
2. Reuse repository conventions for script naming and command composition.
3. Avoid silently replacing behaviour unrelated to the request.
4. Add or update the script.
5. Do not run final package formatting or validation here.
6. Return:
   - previous value, when present;
   - resulting value;
   - affected file;
   - any related validation command.
