"use strict";

var marko_template = module.exports = require("marko/src/html").t(__filename),
    marko_component = {},
    marko_componentType = "/marko-test$1.0.0/autotests/components-compilation/boundary-no-output-tag-el/index.marko",
    components_helpers = require("marko/src/components/helpers"),
    marko_renderer = components_helpers.r,
    marko_defineComponent = components_helpers.c,
    marko_helpers = require("marko/src/runtime/html/helpers"),
    marko_loadTag = marko_helpers.t,
    test_no_output_tag = marko_loadTag(require("./components/test-no-output/renderer"));

function render(input, out, __component, component, state) {
  var data = input;

  test_no_output_tag({}, out);

  out.w("<div></div>");
}

marko_template._ = marko_renderer(render, {
    ___type: marko_componentType
  }, marko_component);

marko_template.Component = marko_defineComponent(marko_component, marko_template._);

marko_template.meta = {
    id: "/marko-test$1.0.0/autotests/components-compilation/boundary-no-output-tag-el/index.marko",
    component: "./",
    tags: [
      "./components/test-no-output/renderer"
    ]
  };
