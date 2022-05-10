<template>
  <div>{{}}</div>
</template>

<script lang="ts">
import Vue from "vue";
import { Prop, Component, Ref, Model, Provide, Inject } from "vue-property-decorator";
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
