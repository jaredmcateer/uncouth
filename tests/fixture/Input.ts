import Vue from "vue";
import { Prop, Component, Ref, Model, Watch, Emit } from "vue-property-decorator";
import { Action, Getter, Mutation, State } from "vuex-class";

/**
 * My basic tag
 */
@Component({
  name: "oao",
  props: {
    bar: String,
  },
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
  @Prop() noType: any;
  @Prop() stringType: string;
  @Prop() booleanType: boolean;
  @Prop() numberType: number;
  @Prop() stringLiteralType: "foo";
  @Prop() numericLiteral: 2;
  @Prop() booleanLiteral: true;
  @Prop() complexType: true | "false";
  @Prop() complexType2: string[];

  @Action() actA;
  @Action("namespace/actD") actD;
  @Action("namespace/actE") actE: (val: "foo" | "bar") => Promise<number>;
  @Action(actG) actuhGee: (val: "foo" | "bar") => Promise<number>;
  @Action() actH: () => Promise<number>;

  @Mutation() mutateA;
  @Mutation("namespace/mutateB") mutateB;
  @Mutation("namespace/mutateE") mutateE: (val: "foo" | "bar") => number;
  @Mutation(mutateG) mGee: (val: "foo" | "bar") => number;
  @Mutation() mutateH: () => number;

  @Getter() getA;
  @Getter() getB: number;
  @Getter("namespace/getC") getTheC;
  @Getter(cGetG) getTheG: number;

  @State() stateA;
  @State() stateB: number;
  @State("namespace/StateC") getStateC: Foo;
  @State(ns.keys.stateD) stateD: boolean;

  $refs!: {
    myDiv: HTMLDivElement;
    mySpan;
    myComponent: MyComponent;
  };

  /**
   * My msg
   */
  msg = 'Vetur means "Winter" in icelandic.'; // foo

  /**
   * My count
   */
  get count() {
    return this.$store.state.count;
  }

  get value() {
    return this.checked;
  }

  set value(value: boolean) {
    this.$emit("change", value);
  }

  @Watch("checked", { deep: true, immediate: true })
  onCheckedChanged(val: boolean, newVal: boolean) {
    console.log(val, newVal);
    console.log(this.anotherComponent);
  }

  @Watch("msg")
  onMsgChanged(val: string, newVal: string) {
    console.log(val, newVal);
  }

  mounted() {
    this.click("oao");
  }

  created() {
    this.removeItem();
  }

  beforeDestroy() {
    this.$emit("tearing down");
  }

  destroyed() {
    console.log("destroyed");
  }

  @Emit()
  click(c: string) {}

  @Emit("remove")
  removeItem() {
    if (this.foo > 10) {
      return 10;
    } else {
      return this.foo;
    }
  }

  refAccess() {
    const foo = { myDiv: true };
    foo.myDiv = false; // should not transform
    this.$refs.myDiv.focus();
    this.$refs.mySpan.innerText = "foo";
    this.$refs.myComponent.vm.doSomething();
  }

  /**
   * My greeting
   */
  hello() {
    console.log(this.msg);
  }
}
