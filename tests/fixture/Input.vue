<template>
  <div>{{}}</div>
</template>

<script lang="ts">
import Vue from "vue";
import { Prop, Component, Ref, Model, Provide, Inject } from "vue-property-decorator";
import { Action } from "vuex-class";
import MyComponent from "my-component.vue";

const symbol = Symbol("baz");

/**
 * My basic tag
 */
@Component({
  name: "oao",
  props: ["bar", "qaq", "cac"],
  data() {
    const a = "pa";
    return {
      a: a,
    };
  },
})
export default class BasicPropertyClass extends Vue {
  @Ref() readonly anotherComponent!: HTMLElement;
  @Model("change", { type: Boolean }) readonly checked!: boolean;
  /**
   * My foo
   */
  @Prop({ type: Boolean, default: false }) foo!;
  @Prop({ type: Number, default: 1 }) bar: number;
  @Prop({ type: Object }) foobar: CustomType;

  @Provide() foa = "foo";
  @Provide("bar") baz = "bar";

  @Inject() readonly foai!: string;
  @Inject("bar") readonly bari!: string;
  @Inject({ from: "optional", default: "default" }) readonly optional!: string;
  @Inject(symbol) readonly bazi!: string;

  @Action() actA;
  // hmm all actions are promises.
  @Action() actB: (str: string) => number;
  @Action() actC: (val: "foo" | "bar") => Promise<number>;
  @Action("namespace/actD") actD;
  @Action("namespace/actE") actE: (val: "foo" | "bar") => Promise<number>;
  @Action(actF) actionEff;
  @Action(actG) actuhGee: (val: "foo" | "bar") => Promise<number>;

  $refs!: {
    myDiv: HTMLDivElement;
    mySpan;
    myComponent: MyComponent;
  };

  /**
   * My msg
   */
  msg = 'Vetur means "Winter" in icelandic.'; //foo

  /**
   * My count
   */
  get count() {
    return this.$store.state.count;
  }

  /**
   * My greeting
   */
  hello() {
    console.log(this.msg);
    console.log(this.actB("foo"));
  }

  beforeDestroy() {
    this.$emit("Tearing down");
  }

  destroyed() {
    console.log("destroyed");
  }

  refAccess() {
    const foo = { myDiv: true };
    foo.myDiv = false; // should not transform
    this.$refs.myDiv.focus();
    this.$refs.mySpan.innerText = "foo";
    this.$refs.myComponent.vm.doSomething();
  }
}
</script>
