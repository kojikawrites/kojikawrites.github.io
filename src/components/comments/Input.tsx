import { splitProps, type Component, type JSX } from "solid-js";

type InputProps = JSX.InputHTMLAttributes<HTMLInputElement>;

// @ts-ignore
export const Input: Component<InputProps> = (props) => {
  const [, rest] = splitProps(props, ["children"]);
  // @ts-ignore
    return (
    <input
      {...rest}
      class='comments-login-input'
    />
  );
};
