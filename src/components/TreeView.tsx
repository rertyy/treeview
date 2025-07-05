import { memo, useState } from "react";

export type Selected = "Empty" | "Partial" | "Full";

type RenderNodeProps = {
  node: Node;
};

export type Node = {
  key: string;
  data: string;
  children: string[];
  level: number;
  isOpen: boolean;
  checkedState: Selected;
};

type TreeState = {
  nodes: Record<string, Node>;
  rootId: string;
};

const setClosed = (n: Node): Node => ({ ...n, isOpen: false });
const setOpen = (n: Node): Node => ({ ...n, isOpen: true });

const createDefaultTreeView = (): TreeState => {
  const rootId = crypto.randomUUID();
  return {
    rootId,
    nodes: {
      [rootId]: {
        key: rootId,
        data: "Root",
        children: [],
        level: 0,
        isOpen: true,
        checkedState: "Empty",
      },
    },
  };
};

const TreeView = () => {
  const [tree, setTree] = useState<TreeState>(createDefaultTreeView());
  const rootNode = tree.nodes[tree.rootId];
  const [count, setCount] = useState(0);

  const modifyRecursively = (parent: Node, updater: (n: Node) => Node) => {
    const updatedNodes = { ...tree.nodes };
    const modify = (key: string) => {
      updatedNodes[key] = { ...updater(updatedNodes[key]) };
      updatedNodes[key].children.forEach(modify);
    };
    modify(parent.key);
    setTree((prevTree) => {
      const newTree: TreeState = { ...prevTree, nodes: updatedNodes };
      return newTree;
    });
  };

  const foldRecursively = (parent: Node) => {
    modifyRecursively(parent, setClosed);
  };
  const expandRecursively = (parent: Node) => {
    modifyRecursively(parent, setOpen);
  };

  const addChild = (parent: Node) => {
    const uuid = crypto.randomUUID();
    const newChild: Node = {
      key: uuid,
      data: uuid,
      children: [],
      level: parent.level + 1,
      isOpen: true,
      checkedState: "Empty",
    };
    setTree((prev) => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [uuid]: newChild,
        [parent.key]: {
          ...prev.nodes[parent.key],
          children: [...parent.children, uuid],
        },
      },
    }));
  };

  const toggleNode = (node: Node) => {
    setTree((prev) => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [node.key]: {
          ...prev.nodes[node.key],
          isOpen: !node.isOpen,
        },
      },
    }));
  };

  const resetTree = () => {
    setTree(createDefaultTreeView());
  };
  const RenderNode = ({ node }: RenderNodeProps) => {
    return (
      <div style={{ paddingLeft: node.level }}>
        <button onClick={() => addChild(node)}>Add</button>
        {/*<button onClick={() => deleteNode(node)}>Del</button>*/}
        {/*<button onClick={() => editNode(node)}>Edit</button>*/}
        <button onClick={() => foldRecursively(node)}>Fold all</button>
        <button onClick={() => expandRecursively(node)}>Expand all</button>
        <button
          disabled={node.children.length === 0}
          onClick={() => toggleNode(node)}
        >
          {node.children.length === 0
            ? "No children"
            : node.isOpen
              ? "Collapse"
              : "Expand"}
        </button>

        <textarea defaultValue={node.data} />
        {node.isOpen &&
          node.children.map((childId) => {
            const childNode = tree.nodes[childId];
            return <MemoRender node={childNode} key={childNode?.key} />;
          })}
      </div>
    );
  };

  const MemoRender = memo(RenderNode);

  return (
    <div>
      <button onClick={() => setCount((count) => count + 1)}>
        count is {count}
      </button>

      <button onClick={resetTree}>Reset all nodes</button>
      <button onClick={() => foldRecursively(rootNode)}>
        Fold all recursively
      </button>
      <button onClick={() => expandRecursively(rootNode)}>
        Expand all recursively
      </button>
      <div>Hello</div>
      <MemoRender node={rootNode} />
    </div>
  );
};

export default TreeView;
