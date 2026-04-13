def format_chart_config(params: dict) -> dict:
    """
    Takes the LLM's tool call parameters and returns a clean chart config
    for the React frontend to consume.
    """
    return {
        "type": params.get("chart_type", "bar"),
        "x": params.get("x_axis"),
        "y": params.get("y_axis"),
    }