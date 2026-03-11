import React from "react";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import Routes from "./Routes";
import "./styles/globals.css";

const DesktopApp = () => {
  return (
    <Provider store={store}>
      <Routes />
    </Provider>
  );
};

export default DesktopApp;
