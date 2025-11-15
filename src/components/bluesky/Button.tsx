import { splitProps, type Component, type JSX } from "solid-js";

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>;

// @ts-ignore
export const Button: Component<ButtonProps> = (props) => {
  const [, rest] = splitProps(props, ["children"]);
  return (
    <button
      {...rest}>
      {props.children}
    </button>
  );
};
